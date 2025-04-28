import { EventData, Observable, Page, Frame } from '@nativescript/core';
import { HelloWorldModel } from './main-view-model';
import { action } from '@nativescript/core/ui/dialogs';

let model: HelloWorldModel;

export function onNavigatingTo(args: EventData) {
    const page = args.object as Page;
    model = page.bindingContext as HelloWorldModel;
}

export function onTrackTap(args: EventData) {
    model.onTrackTap(args);
}

export function onPlayPause() {
    model.onPlayPause();
}

export function onPreviousTrack() {
    model.onPreviousTrack();
}

export function onNextTrack() {
    model.onNextTrack();
}

export function onBackToPlaylists() {
    model.onBackToPlaylists();
    const frame = Frame.getFrameById('main-frame');
    if (frame) {
        frame.navigate('app/home-page');
    }
}

export function onAddToPlaylist() {
    if (!model.currentTrack) return;

    const localPlaylists = model.localPlaylists;
    const options = {
        title: "Add to Playlist",
        message: "Select a playlist",
        cancelButtonText: "Cancel",
        actions: localPlaylists.map(playlist => playlist.name)
    };

    action(options).then(result => {
        if (result !== "Cancel") {
            const selectedPlaylist = localPlaylists.find(p => p.name === result);
            if (selectedPlaylist) {
                model.addToLocalPlaylist(selectedPlaylist.id, model.currentTrack);
            }
        }
    });
} 