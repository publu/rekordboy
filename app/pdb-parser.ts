import { parsePdb, RekordboxPdb, tableRows } from 'rekordbox-parser';
import { decode } from 'iconv-lite';

declare var NSFileManager: any;

const { PageType } = RekordboxPdb;

export interface Track {
    id: number;
    title: string;
    duration: number;
    tempo: number;
    rating: number;
    filePath: string;
}

export interface Playlist {
    id: number;
    name: string;
    trackCount: number;
}

export class PdbParser {
    private static instance: PdbParser;
    private db: any = null;
    private rootPath: string = '';

    private constructor() {
        console.log('[PdbParser] Initializing parser instance');
    }

    public static getInstance(): PdbParser {
        if (!PdbParser.instance) {
            console.log('[PdbParser] Creating new parser instance');
            PdbParser.instance = new PdbParser();
        }
        return PdbParser.instance;
    }

    public setRootPath(path: string) {
        console.log('[PdbParser] Setting root path:', path);
        this.rootPath = path.replace('/PIONEER/rekordbox/exportLibrary.pdb', '');
    }

    private decodeText(text: any): string {
        if (!text || !text.body || !text.body.text) return '';
        
        try {
            // First try UTF-8
            const decoded = decode(Buffer.from(text.body.text), 'utf8');
            if (decoded && !decoded.includes('�')) {
                return decoded;
            }
            
            // If UTF-8 fails, try Shift-JIS
            return decode(Buffer.from(text.body.text), 'shift-jis');
        } catch (error) {
            console.error('[PdbParser] Error decoding text:', error);
            return text.body.text || '';
        }
    }

    public async parsePdbFile(fileData: Uint8Array): Promise<Playlist[]> {
        try {
            console.log('[PdbParser] parsePdbFile started');
            const bufferData = Buffer.from(fileData); // Convert Uint8Array to Buffer
            this.db = parsePdb(bufferData);

            const playlistTreeTable = this.db.tables.find(
                (table: any) => table.type === PageType.PLAYLIST_TREE
            );
            
            if (!playlistTreeTable) {
                console.error('[PdbParser] No playlist tree table found');
                return [];
            }

            const playlists: Playlist[] = [];
            for (const row of tableRows(playlistTreeTable)) {
                if (row && row.name) {
                    const name = this.decodeText(row.name);
                    playlists.push({
                        id: row.id,
                        name: name,
                        trackCount: 0
                    });
                    console.log(`[PdbParser] Found playlist: ${name} (ID: ${row.id})`);
                }
            }

            return playlists;
        } catch (error) {
            console.error('[PdbParser] Error parsing PDB file:', error);
            throw new Error('Failed to parse PDB file');
        }
    }

    public getTracksForPlaylist(playlistId: number): Promise<Track[]> {
        return new Promise((resolve, reject) => {
            try {
                console.log(`[PdbParser] Getting tracks for playlist ${playlistId}`);
                
                if (!this.db) {
                    console.error('[PdbParser] No database loaded');
                    resolve([]);
                    return;
                }

                const playlistEntriesTable = this.db.tables.find(
                    (table: any) => table.type === PageType.PLAYLIST_ENTRIES
                );
                const tracksTable = this.db.tables.find(
                    (table: any) => table.type === PageType.TRACKS
                );

                if (!playlistEntriesTable || !tracksTable) {
                    console.error('[PdbParser] Required tables not found');
                    resolve([]);
                    return;
                }

                console.log('[PdbParser] Getting track IDs for playlist');
                const trackIds = new Set<number>();
                
                for (const row of tableRows(playlistEntriesTable)) {
                    if (row?.playlistId === playlistId && typeof row.trackId === 'number') {
                        trackIds.add(row.trackId);
                    }
                }
                
                console.log(`[PdbParser] Found ${trackIds.size} track IDs in playlist`);
                
                const tracks: Track[] = [];
                let count = 0;

                for (const row of tableRows(tracksTable)) {
                    if (row && trackIds.has(row.id)) {
                        try {
                            count++;
                            console.log(`[PdbParser] Processing track ${count}/${trackIds.size}`);
                            
                            const track: Track = {
                                id: row.id,
                                title: this.decodeText(row.title) || '',
                                duration: row.duration || 0,
                                tempo: (row.tempo || 0) / 100,
                                rating: row.rating || 0,
                                filePath: this.rootPath + (this.decodeText(row.filePath) || '')
                            };

                            // Add debug logging for FLAC files
                            if (track.filePath.toLowerCase().endsWith('.flac')) {
                                console.log(`[PdbParser] Found FLAC file: ${track.filePath}`);
                                const fileManager = NSFileManager.defaultManager;
                                const exists = fileManager.fileExistsAtPath(track.filePath);
                                console.log(`[PdbParser] FLAC file exists: ${exists}`);
                            }

                            tracks.push(track);
                            console.log(`[PdbParser] Added track: ${track.title}`);
                        } catch (error) {
                            console.error(`[PdbParser] Error processing track ${row.id}:`, error);
                        }
                    }
                }

                console.log(`[PdbParser] Finished loading ${tracks.length} tracks`);
                resolve(tracks);
            } catch (error) {
                console.error('[PdbParser] Error in getTracksForPlaylist:', error);
                reject(error);
            }
        });
    }
}