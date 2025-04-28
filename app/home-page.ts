import { EventData, Observable, Page, Frame } from '@nativescript/core';
import { HelloWorldModel } from './main-view-model';
import { prompt } from '@nativescript/core/ui/dialogs';
import { SegmentedBar } from '@nativescript/core/ui/segmented-bar';

let model: HelloWorldModel;

export function onNavigatingTo(args: EventData) {
    const page = args.object as Page;
    model = new HelloWorldModel();
    page.bindingContext = model;
}

export function onPlaylistTap(args: EventData) {
    model.onPlaylistTap(args);
    const frame = Frame.getFrameById('main-frame');
    if (frame) {
        frame.navigate('app/track-page');
    }
}

export function onAddPlaylist() {
    if (model.viewMode === 'local') {
        prompt({
            title: "New Playlist",
            message: "Enter playlist name:",
            okButtonText: "Create",
            cancelButtonText: "Cancel",
            defaultText: "",
        }).then(result => {
            if (result.result && result.text.trim()) {
                model.createLocalPlaylist(result.text.trim());
            }
        });
    }
}

export function onSegmentedBarSelectedIndexChanged(args: EventData) {
    const segmentedBar = args.object as SegmentedBar;
    model.viewMode = segmentedBar.selectedIndex === 0 ? 'rekordbox' : 'local';
} 