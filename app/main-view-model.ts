import { Observable, File, knownFolders, path } from '@nativescript/core';
import { FilePicker } from './file-picker';
import { PdbParser, Playlist, Track } from './pdb-parser';
import { AVPlayerWrapper } from './av-player';
import { LocalPlaylistManager, LocalPlaylist } from './local-playlist-manager';

declare var NSURL: any, NSFileManager: any, NSData: any, interop: any;

export class HelloWorldModel extends Observable {
    private filePicker: FilePicker;
    private parser: PdbParser;
    private _playlists: Playlist[] = [];
    private _localPlaylists: LocalPlaylist[] = [];
    private _tracks: Track[] = [];
    private _selectedPlaylist: Playlist | LocalPlaylist | null = null;
    private _currentTrack: Track | null = null;
    private _isPlaying: boolean = false;
    private _currentTimeValue: number = 0;
    private _duration: number = 0;
    private _currentTime: string = "0:00";
    private player: AVPlayerWrapper;
    private folderURL: any = null;
    private currentTrackIndex: number = -1;
    private _loadingProgress: number = 0;
    private _isLoading: boolean = false;
    private _loadingMessage: string = 'Loading...';
    private _playlistCache: Map<number, Track[]> = new Map();
    private _viewMode: 'rekordbox' | 'local' = 'rekordbox';
    private localPlaylistManager: LocalPlaylistManager;

    constructor() {
        super();
        console.log('[ViewModel] Initializing HelloWorldModel');
        this.filePicker = new FilePicker();
        this.parser = PdbParser.getInstance();
        this.player = new AVPlayerWrapper();
        this.localPlaylistManager = LocalPlaylistManager.getInstance();
        this._localPlaylists = this.localPlaylistManager.getPlaylists();

        // Handle playback completion
        this.player.on('completed', () => {
            console.log('[ViewModel] Playback completed');
            this._isPlaying = false;
            this.notifyPropertyChange('isPlaying', this._isPlaying);
            // Auto-play next track
            this.onNextTrack();
        });

        // Handle time updates
        this.player.on('timeChanged', (args: any) => {
            const { currentTime, duration } = args.data;
            this._currentTimeValue = currentTime;
            this._duration = duration;
            this._currentTime = this.formatTime(currentTime);
            
            this.notifyPropertyChange('currentTimeValue', this._currentTimeValue);
            this.notifyPropertyChange('duration', this._duration);
            this.notifyPropertyChange('currentTime', this._currentTime);
        });

        this.filePicker.on("folderSelected", async (args: any) => {
            if (args.data.error) {
                console.error('[ViewModel] Folder selection error:', args.data.error);
                return;
            }

            if (args.data.url) {
                try {
                    this.setLoadingState(true);
                    this.updateLoadingProgress(0);

                    this.folderURL = args.data.url;
                    const started = this.folderURL.startAccessingSecurityScopedResource?.();
                    if (started === false) {
                        throw new Error('Failed to access security-scoped resource');
                    }

                    const fileManager = NSFileManager.defaultManager;
                    const pdbPath = path.join(args.data.path, 'PIONEER', 'rekordbox', 'export.pdb');
                    console.log('[ViewModel] Looking for PDB at:', pdbPath);

                    if (!fileManager.fileExistsAtPath(pdbPath)) {
                        console.error('[ViewModel] PDB file not found at:', pdbPath);
                        alert('No rekordbox export.pdb file found in the selected folder');
                        return;
                    }

                    const pdbURL = NSURL.fileURLWithPath(pdbPath);
                    console.log('[ViewModel] Loading PDB file from URL:', pdbURL?.absoluteString);

                    const fileData = NSData.dataWithContentsOfURL(pdbURL);
                    if (!fileData) {
                        throw new Error('Failed to read PDB file (NSData is null)');
                    }

                    const fileContent = new Uint8Array(interop.bufferFromData(fileData));

                    this.parser.setRootPath(args.data.path);
                    const playlists = await this.parser.parsePdbFile(fileContent);

                    this.updateLoadingProgress(80);

                    this._playlists = playlists;
                    this._tracks = [];
                    this._selectedPlaylist = null;
                    this._currentTrack = null;
                    this._isPlaying = false;
                    this.currentTrackIndex = -1;

                    this.notifyPropertyChange('playlists', this._playlists);
                    this.notifyPropertyChange('tracks', this._tracks);
                    this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
                    this.notifyPropertyChange('currentTrack', this._currentTrack);
                    this.notifyPropertyChange('isPlaying', this._isPlaying);

                    this.updateLoadingProgress(100);

                } catch (error) {
                    console.error('[ViewModel] Error processing PDB file:', error);
                    alert('Error processing PDB file. Please try again.');
                } finally {
                    this.setLoadingState(false);
                    this.folderURL.stopAccessingSecurityScopedResource?.();
                }
            }
        });
    }

    public formatTime(seconds: number): string {
        if (!seconds || isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    public onPickFolder() {
        console.log('[ViewModel] Pick folder triggered');
        this.filePicker.pickFolder();
    }

    get playlists(): Playlist[] {
        return this._playlists;
    }
    get tracks(): Track[] {
        return this._tracks;
    }
    get selectedPlaylist(): Playlist | LocalPlaylist | null {
        return this._selectedPlaylist;
    }
    get currentTrack(): Track | null {
        return this._currentTrack;
    }
    get isPlaying(): boolean {
        return this._isPlaying;
    }
    get currentTimeValue(): number {
        return this._currentTimeValue;
    }
    set currentTimeValue(value: number) {
        if (this._currentTimeValue !== value) {
            this._currentTimeValue = value;
            this.notifyPropertyChange('currentTimeValue', value);
            // When the user changes the time via slider, seek to that position
            this.player.seekTo(value);
        }
    }
    get duration(): number {
        return this._duration;
    }
    get currentTime(): string {
        return this._currentTime;
    }
    get loadingProgress(): number {
        return this._loadingProgress;
    }
    get isLoading(): boolean {
        return this._isLoading;
    }
    get loadingMessage(): string {
        return this._loadingMessage;
    }
    get viewMode(): 'rekordbox' | 'local' {
        return this._viewMode;
    }

    set viewMode(value: 'rekordbox' | 'local') {
        if (this._viewMode !== value) {
            this._viewMode = value;
            this.notifyPropertyChange('viewMode', this._viewMode);
            this._selectedPlaylist = null;
            this._tracks = [];
            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
            this.notifyPropertyChange('tracks', this._tracks);
        }
    }

    get localPlaylists(): LocalPlaylist[] {
        return this._localPlaylists;
    }

    public createLocalPlaylist(name: string): void {
        const playlist = this.localPlaylistManager.createPlaylist(name);
        this._localPlaylists = this.localPlaylistManager.getPlaylists();
        this.notifyPropertyChange('localPlaylists', this._localPlaylists);
    }

    public addToLocalPlaylist(playlistId: string, track: Track): void {
        if (this.localPlaylistManager.addTrackToPlaylist(playlistId, track)) {
            this._localPlaylists = this.localPlaylistManager.getPlaylists();
            this.notifyPropertyChange('localPlaylists', this._localPlaylists);
        }
    }

    public removeFromLocalPlaylist(playlistId: string, trackId: number): void {
        if (this.localPlaylistManager.removeTrackFromPlaylist(playlistId, trackId)) {
            this._localPlaylists = this.localPlaylistManager.getPlaylists();
            this.notifyPropertyChange('localPlaylists', this._localPlaylists);
        }
    }

    public deleteLocalPlaylist(playlistId: string): void {
        if (this.localPlaylistManager.deletePlaylist(playlistId)) {
            this._localPlaylists = this.localPlaylistManager.getPlaylists();
            this.notifyPropertyChange('localPlaylists', this._localPlaylists);
        }
    }

    public renameLocalPlaylist(playlistId: string, newName: string): void {
        if (this.localPlaylistManager.renamePlaylist(playlistId, newName)) {
            this._localPlaylists = this.localPlaylistManager.getPlaylists();
            this.notifyPropertyChange('localPlaylists', this._localPlaylists);
        }
    }

    onPlaylistTap(args: any) {
        try {
            console.log('[ViewModel] Playlist tap event:', args.index);
            const playlists = this._viewMode === 'rekordbox' ? this._playlists : this._localPlaylists;
            
            if (!playlists || !Array.isArray(playlists)) {
                console.error('[ViewModel] Playlists array is invalid');
                return;
            }

            const playlist = playlists[args.index];
            if (!playlist) {
                console.error('[ViewModel] Invalid playlist index:', args.index);
                return;
            }
            console.log('[ViewModel] Selected playlist:', playlist.name);

            // Clear previous state
            this._selectedPlaylist = null;
            this._tracks = [];
            this._currentTrack = null;
            this.currentTrackIndex = -1;
            this._isPlaying = false;
            
            // Notify all state changes
            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
            this.notifyPropertyChange('tracks', this._tracks);
            this.notifyPropertyChange('currentTrack', this._currentTrack);
            this.notifyPropertyChange('isPlaying', this._isPlaying);

            // Set new playlist
            this._selectedPlaylist = playlist;
            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);

            if (this._viewMode === 'rekordbox') {
                // Handle rekordbox playlist
                const rekordboxPlaylist = playlist as Playlist;
                const cachedTracks = this._playlistCache.get(rekordboxPlaylist.id);
                if (cachedTracks) {
                    console.log('[ViewModel] Using cached tracks for playlist:', playlist.name);
                    this._tracks = cachedTracks;
                    this.notifyPropertyChange('tracks', this._tracks);
                    return;
                }

                this.setLoadingState(true, `Loading ${playlist.name}...`);
                
                console.log('[ViewModel] Starting to load tracks for playlist:', playlist.name);
                this.parser.getTracksForPlaylist(rekordboxPlaylist.id)
                    .then(tracks => {
                        if (!tracks || !Array.isArray(tracks)) {
                            throw new Error('Invalid tracks data received');
                        }
                        console.log('[ViewModel] Successfully loaded tracks:', tracks.length);
                        
                        // Update playlist track count
                        rekordboxPlaylist.trackCount = tracks.length;
                        this.notifyPropertyChange('playlists', this._playlists);
                        
                        // If no tracks, clear selected playlist and return to playlist view
                        if (tracks.length === 0) {
                            this._selectedPlaylist = null;
                            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
                            this.setLoadingState(false);
                            return;
                        }
                        
                        this._tracks = tracks;
                        // Cache the tracks
                        this._playlistCache.set(rekordboxPlaylist.id, tracks);
                        this.notifyPropertyChange('tracks', this._tracks);
                        this.setLoadingState(false);
                    })
                    .catch(error => {
                        console.error('[ViewModel] Error loading tracks:', error);
                        this._selectedPlaylist = null;
                        this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
                        this.setLoadingState(false);
                        alert('Error loading tracks. Please try again.');
                    });
            } else {
                // Handle local playlist
                const localPlaylist = playlist as LocalPlaylist;
                this._tracks = localPlaylist.tracks;
                this.notifyPropertyChange('tracks', this._tracks);
            }
        } catch (error) {
            console.error('[ViewModel] Error in onPlaylistTap:', error);
            this._selectedPlaylist = null;
            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
            this.setLoadingState(false);
        }
    }

    private async loadPlaylists(fileContent: Uint8Array) {
        try {
            this.setLoadingState(true, 'Loading playlists...');
            
            // Clear existing state first
            this._playlists = [];
            this._tracks = [];
            this._selectedPlaylist = null;
            this._currentTrack = null;
            this.currentTrackIndex = -1;
            this._isPlaying = false;
            this._playlistCache.clear();
            
            // Notify all state changes
            this.notifyPropertyChange('playlists', this._playlists);
            this.notifyPropertyChange('tracks', this._tracks);
            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
            this.notifyPropertyChange('currentTrack', this._currentTrack);
            this.notifyPropertyChange('isPlaying', this._isPlaying);
            
            // Load playlists
            const playlists = await this.parser.parsePdbFile(fileContent);
            
            // Clean up playlist array - only keep playlists with valid IDs and names
            const cleanedPlaylists = playlists.filter(playlist => 
                playlist && 
                typeof playlist.id === 'number' && 
                typeof playlist.name === 'string' && 
                playlist.name.trim() !== ''
            );
            
            // Initialize playlists with default track count
            for (const playlist of cleanedPlaylists) {
                playlist.trackCount = 0;
            }
            
            // Update playlists and notify
            this._playlists = cleanedPlaylists;
            this.notifyPropertyChange('playlists', this._playlists);
            
            this.setLoadingState(false);
        } catch (error) {
            console.error('[ViewModel] Error loading playlists:', error);
            this.setLoadingState(false);
            alert('Error loading playlists. Please try again.');
        }
    }

    public async onTrackTap(args: any) {
        console.log('[ViewModel] Track tap event:', args.index);
        this.currentTrackIndex = args.index;
        this.setLoadingState(true, 'Preparing track...');
        try {
            await this.playTrack(this._tracks[this.currentTrackIndex]);
        } finally {
            this.setLoadingState(false);
        }
    }

    private async playTrack(track: Track) {
        try {
            if (this._isPlaying) {
                this.player.pause();
                this._isPlaying = false;
                this.notifyPropertyChange('isPlaying', this._isPlaying);
            }

            this._currentTrack = track;
            this.notifyPropertyChange('currentTrack', this._currentTrack);

            const started = this.folderURL?.startAccessingSecurityScopedResource?.();
            if (started === false) {
                throw new Error('Could not start folder scope for track playback');
            }

            try {
                const audioURL = NSURL.fileURLWithPath(track.filePath);
                const urlString = audioURL.absoluteString;
                console.log('[ViewModel] Playing audio from URL:', urlString);

                this.player.initFromUrl(urlString);
                this.player.play();
                
                this._isPlaying = true;
                this.notifyPropertyChange('isPlaying', this._isPlaying);
            } finally {
                this.folderURL?.stopAccessingSecurityScopedResource?.();
            }

        } catch (error) {
            console.error('[ViewModel] Error initializing audio:', error);
            alert('Error playing track. Make sure the audio file exists and is accessible.');
        }
    }

    public onBackToPlaylists() {
        console.log('[ViewModel] Going back to playlists');
        try {
            // Clear track-related state
            this._tracks = [];
            this._selectedPlaylist = null;
            this._currentTrack = null;
            this.currentTrackIndex = -1;
            this._isPlaying = false;
            
            // Notify changes
            var n=1;
            this.notifyPropertyChange('tracks', this._tracks);
            console.log(n++)
            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
            console.log(n++)
            this.notifyPropertyChange('currentTrack', this._currentTrack);
            console.log(n++)
            this.notifyPropertyChange('isPlaying', this._isPlaying);
            console.log(n++)
            
            // Clear cache if it gets too large
            if (this._playlistCache.size > 10) {
                console.log('[ViewModel] Clearing playlist cache');
                this._playlistCache.clear();
            }
            
            console.log('[ViewModel] Successfully reset to playlist view');
        } catch (error) {
            console.error('[ViewModel] Error in onBackToPlaylists:', error);
            // Ensure state is cleared even if there's an error
            this._tracks = [];
            this._selectedPlaylist = null;
            this._currentTrack = null;
            this.currentTrackIndex = -1;
            this._isPlaying = false;
            this.notifyPropertyChange('tracks', this._tracks);
            this.notifyPropertyChange('selectedPlaylist', this._selectedPlaylist);
            this.notifyPropertyChange('currentTrack', this._currentTrack);
            this.notifyPropertyChange('isPlaying', this._isPlaying);
        }
    }

    public async onPlayPause() {
        if (!this._currentTrack) return;

        try {
            const started = this.folderURL?.startAccessingSecurityScopedResource?.();
            
            try {
                if (this._isPlaying) {
                    this.player.pause();
                } else {
                    this.player.play();
                }
                this._isPlaying = !this._isPlaying;
                this.notifyPropertyChange('isPlaying', this._isPlaying);
                console.log('[ViewModel] Playback state changed:', this._isPlaying ? 'playing' : 'paused');
            } finally {
                if (started !== false) {
                    this.folderURL?.stopAccessingSecurityScopedResource?.();
                }
            }
        } catch (error) {
            console.error('[ViewModel] Error toggling playback:', error);
            if (error?.message) {
                console.error('[ViewModel] Error details:', error.message);
            }
            alert('Error controlling playback');
        }
    }

    public onTimelineValueChanged(args: any) {
        if (!this._currentTrack) return;
        
        const value = args.value;
        this.player.seekTo(value);
    }

    public onPreviousTrack() {
        if (this.currentTrackIndex <= 0) return;
        
        this.currentTrackIndex--;
        this.playTrack(this._tracks[this.currentTrackIndex]);
    }

    public onNextTrack() {
        if (this.currentTrackIndex >= this._tracks.length - 1) return;
        
        this.currentTrackIndex++;
        this.playTrack(this._tracks[this.currentTrackIndex]);
    }

    private updateLoadingProgress(progress: number) {
        this._loadingProgress = progress;
        this.notifyPropertyChange('loadingProgress', this._loadingProgress);
    }

    private setLoadingState(isLoading: boolean, message: string = 'Loading...') {
        this._isLoading = isLoading;
        this._loadingMessage = message;
        this.notifyPropertyChange('isLoading', this._isLoading);
        this.notifyPropertyChange('loadingMessage', this._loadingMessage);
    }
}