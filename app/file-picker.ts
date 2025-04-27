import { Observable, Application } from "@nativescript/core";

declare var UIDocumentPickerViewController, UIDocumentPickerMode, NSURL,
            UIApplication, UIModalPresentationStyle, NSObject, UIDocumentPickerDelegate;

export class FilePicker extends Observable {
    public pickFolder() {
        if (global.isIOS) {
            this.pickFolder_iOS();
        } else if (global.isAndroid) {
            console.log("[FilePicker] Folder picking not implemented for Android");
        }
    }

    private pickFolder_iOS() {
        const UTTypes = ["public.folder"];
        const picker = UIDocumentPickerViewController.alloc()
            .initWithDocumentTypesInMode(UTTypes, UIDocumentPickerMode.Open);

        picker.delegate = UIDocumentPickerDelegateImpl.new().initWithOwner(new WeakRef(this));
        picker.modalPresentationStyle = UIModalPresentationStyle.FormSheet;

        const app = UIApplication.sharedApplication;
        let controller = app.keyWindow.rootViewController;
        while (controller.presentedViewController) {
            controller = controller.presentedViewController;
        }
        controller.presentViewControllerAnimatedCompletion(picker, true, null);
    }
}

@NativeClass()
class UIDocumentPickerDelegateImpl extends NSObject {
    public static ObjCProtocols = [UIDocumentPickerDelegate];
    private _owner: WeakRef<FilePicker>;

    public initWithOwner(owner: WeakRef<FilePicker>): UIDocumentPickerDelegateImpl {
        this._owner = owner;
        return this;
    }

    public documentPickerDidPickDocumentAtURL?(
        controller: UIDocumentPickerViewController,
        url: NSURL
    ): void {
        // Optional method - can be implemented if needed
    }

    public documentPickerDidPickDocumentsAtURLs(
        controller: UIDocumentPickerViewController,
        urls: NSArray<NSURL>
    ): void {
        const filePicker = this._owner.get();
        if (!filePicker) return;

        const url = urls.firstObject;
        if (!url) {
            filePicker.notify({
                eventName: "folderSelected",
                object: filePicker,
                data: { error: "No URL selected" }
            });
            return;
        }

        try {
            console.log("[FilePicker] Picked folder:", url.path);
            filePicker.notify({
                eventName: "folderSelected",
                object: filePicker,
                data: {
                    path: url.path,
                    url: url // Pass the NSURL object to maintain security scope
                }
            });
        } catch (error) {
            console.error("[FilePicker] Error handling folder selection:", error);
            filePicker.notify({
                eventName: "folderSelected",
                object: filePicker,
                data: { error: error.message || "Error handling folder selection" }
            });
        }
    }

    public documentPickerWasCancelled(controller: UIDocumentPickerViewController): void {
        const filePicker = this._owner.get();
        if (!filePicker) return;
        console.log("[FilePicker] Document picker was cancelled");
        filePicker.notify({
            eventName: "folderSelected",
            object: filePicker,
            data: { error: "User cancelled" }
        });
    }
}
