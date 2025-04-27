import { Observable } from '@nativescript/core';

declare var AVPlayer: any,
    AVPlayerItem: any,
    NSURL: any,
    NSNotificationCenter: any,
    AVPlayerItemDidPlayToEndTimeNotification: string,
    CMTimeMakeWithSeconds: any,
    CMTimeGetSeconds: any,
    NSFileManager: any;

export class AVPlayerWrapper extends Observable {
    private player: any;
    private item: any;
    private timeObserver: any;

    constructor() {
        super();
    }

    public initFromUrl(urlString: string): void {
        console.log('[AVPlayer] Initializing with URL:', urlString);

        // Add FLAC-specific logging
        if (urlString.toLowerCase().endsWith('.flac')) {
            console.log('[AVPlayer] Attempting to play FLAC file');
            const fileManager = NSFileManager.defaultManager;
            const exists = fileManager.fileExistsAtPath(urlString);
            console.log('[AVPlayer] FLAC file exists:', exists);
        }

        // Dispose any existing player/item first
        this.dispose();

        const nsUrl = NSURL.URLWithString(urlString);
        this.item = AVPlayerItem.playerItemWithURL(nsUrl);
        this.player = AVPlayer.playerWithPlayerItem(this.item);

        // Listen for playback completion
        NSNotificationCenter.defaultCenter.addObserverSelectorNameObject(
            this,
            'playerDidFinishPlaying',
            AVPlayerItemDidPlayToEndTimeNotification,
            this.item
        );

        // Add a periodic time observer (every 0.5s)
        const interval = CMTimeMakeWithSeconds(0.5, 1000); 
        this.timeObserver = this.player.addPeriodicTimeObserverForIntervalQueueUsingBlock(
            interval,
            null,
            (time: any) => {
                const currentTime = CMTimeGetSeconds(time);
                const duration = CMTimeGetSeconds(this.item.duration);
                this.notify({
                    eventName: 'timeChanged',
                    object: this,
                    data: { currentTime, duration }
                });
            }
        );
    }

    private _currentTimeValue = 0;

    public get currentTimeValue(): number {
      return this._currentTimeValue;
    }
    
    public set currentTimeValue(value: number) {
      if (this._currentTimeValue !== value) {
        this._currentTimeValue = value;
        this.notifyPropertyChange('currentTimeValue', value);
      }
    }

    public play(): void {
        if (this.player) {
            console.log('[AVPlayer] Starting playback');
            this.player.play();
        }
    }

    public pause(): void {
        if (this.player) {
            console.log('[AVPlayer] Pausing playback');
            this.player.pause();
        }
    }

    public seekTo(seconds: number): void {
        if (this.player) {
            console.log('[AVPlayer] Seeking to:', seconds);
            const time = CMTimeMakeWithSeconds(seconds, 1000);
            this.player.seekToTime(time);
        }
    }

    /**
     * Sets the AVPlayer volume (0.0 - 1.0).
     * Note: System volume is still controlled by hardware buttons and Control Center.
     */
    public setVolume(value: number): void {
        if (this.player) {
            const clamped = Math.min(Math.max(value, 0.0), 1.0);
            this.player.volume = clamped;
            console.log(`[AVPlayer] Volume set to ${clamped}`);
        }
    }

    public dispose(): void {
        console.log('[AVPlayer] Disposing player');
        if (this.player) {
            if (this.timeObserver) {
                this.player.removeTimeObserver(this.timeObserver);
                this.timeObserver = null;
            }
            this.player.pause();
            this.player = null;
        }
        if (this.item) {
            NSNotificationCenter.defaultCenter.removeObserverNameObject(
                this,
                AVPlayerItemDidPlayToEndTimeNotification,
                this.item
            );
            this.item = null;
        }
    }

    public playerDidFinishPlaying(): void {
        console.log('[AVPlayer] Playback finished');
        this.notify({
            eventName: 'completed',
            object: this
        });
    }
}
