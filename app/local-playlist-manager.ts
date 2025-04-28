import { ApplicationSettings } from '@nativescript/core';
import { Track } from './pdb-parser';

export interface LocalPlaylist {
    id: string;
    name: string;
    tracks: Track[];
    createdAt: number;
    updatedAt: number;
}

export class LocalPlaylistManager {
    private static instance: LocalPlaylistManager;
    private playlists: LocalPlaylist[] = [];
    private readonly STORAGE_KEY = 'local_playlists';

    private constructor() {
        this.loadPlaylists();
    }

    public static getInstance(): LocalPlaylistManager {
        if (!LocalPlaylistManager.instance) {
            LocalPlaylistManager.instance = new LocalPlaylistManager();
        }
        return LocalPlaylistManager.instance;
    }

    private loadPlaylists(): void {
        const stored = ApplicationSettings.getString(this.STORAGE_KEY);
        if (stored) {
            try {
                this.playlists = JSON.parse(stored);
            } catch (error) {
                console.error('Error loading playlists:', error);
                this.playlists = [];
            }
        }
    }

    private savePlaylists(): void {
        ApplicationSettings.setString(this.STORAGE_KEY, JSON.stringify(this.playlists));
    }

    public createPlaylist(name: string): LocalPlaylist {
        const playlist: LocalPlaylist = {
            id: Date.now().toString(),
            name,
            tracks: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        this.playlists.push(playlist);
        this.savePlaylists();
        return playlist;
    }

    public addTrackToPlaylist(playlistId: string, track: Track): boolean {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return false;

        // Check if track already exists in playlist
        if (playlist.tracks.some(t => t.id === track.id)) {
            return false;
        }

        playlist.tracks.push(track);
        playlist.updatedAt = Date.now();
        this.savePlaylists();
        return true;
    }

    public removeTrackFromPlaylist(playlistId: string, trackId: number): boolean {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return false;

        const initialLength = playlist.tracks.length;
        playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
        
        if (playlist.tracks.length !== initialLength) {
            playlist.updatedAt = Date.now();
            this.savePlaylists();
            return true;
        }
        return false;
    }

    public deletePlaylist(playlistId: string): boolean {
        const initialLength = this.playlists.length;
        this.playlists = this.playlists.filter(p => p.id !== playlistId);
        
        if (this.playlists.length !== initialLength) {
            this.savePlaylists();
            return true;
        }
        return false;
    }

    public renamePlaylist(playlistId: string, newName: string): boolean {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (!playlist) return false;

        playlist.name = newName;
        playlist.updatedAt = Date.now();
        this.savePlaylists();
        return true;
    }

    public getPlaylists(): LocalPlaylist[] {
        return [...this.playlists];
    }

    public getPlaylist(playlistId: string): LocalPlaylist | null {
        return this.playlists.find(p => p.id === playlistId) || null;
    }
} 