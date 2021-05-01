interface ISettings {
    freeCamera: boolean;
    music: boolean;
    musicVolume: number;
}

class SettingsManager {
    
    private _freeCameraInput: HTMLSpanElement;
    private _musicInput: HTMLSpanElement;
    private _musicVolumeInput: HTMLInputElement;

    public initialize(): void {
        this.registerUI();
        let settings = localStorage.getItem("galaxy-settings");
        if (settings) {
            let v = JSON.parse(settings) as ISettings;
            if (v.freeCamera === undefined) {
                v.freeCamera = true;
            }
            this.setSettings(v);
        }
    }

    public registerUI(): void {
        let freeCameraInput = document.querySelector("#free-camera-toggle");
        if (freeCameraInput instanceof HTMLSpanElement) {
            this._freeCameraInput = freeCameraInput;
        }
        this._freeCameraInput.addEventListener("pointerup", this.onFreeCameraUpdate);

        let musicInput = document.querySelector("#music-toggle");
        if (musicInput instanceof HTMLSpanElement) {
            this._musicInput = musicInput;
        }
        this._musicInput.addEventListener("pointerup", this.onMusicUpdate);

        let musicVolumeInput = document.querySelector("#music-volume input");
        if (musicVolumeInput instanceof HTMLInputElement) {
            this._musicVolumeInput = musicVolumeInput;
        }
        this._musicVolumeInput.addEventListener("input", this.onMusicVolumeUpdate);
    }

    public getSettings(): ISettings {
        return {
            freeCamera: Main.Camera.useFreeCamera,
            music: Main.MusicManager.musicOn,
            musicVolume: Main.MusicManager.currentVolume
        }
    }

    public setSettings(v: ISettings): void {
        if (v.freeCamera) {
            this._freeCameraInput.classList.remove("off");
            this._freeCameraInput.classList.add("on");
        }
        else {
            this._freeCameraInput.classList.remove("on");
            this._freeCameraInput.classList.add("off");
        }
        this.onFreeCameraUpdate();

        if (v.music) {
            this._musicInput.classList.remove("off");
            this._musicInput.classList.add("on");
            this._musicVolumeInput.parentElement.classList.remove("disabled");
        }
        else {
            this._musicInput.classList.add("off");
            this._musicInput.classList.remove("on");
            this._musicVolumeInput.parentElement.classList.add("disabled");
        }
        this.onMusicUpdate();

        if (isFinite(v.musicVolume)) {
            this._musicVolumeInput.value = (v.musicVolume * 100).toFixed(2);
            this.onMusicVolumeUpdate();
        }
    }

    public saveCurrentSettings(): void {
        let settings = this.getSettings();
        localStorage.setItem("galaxy-settings", JSON.stringify(settings));
    }

    public onFreeCameraUpdate = () => {
        requestAnimationFrame(
            () => {
                let v = this._freeCameraInput.classList.contains("on");
                Main.Camera.setFreeCamera(v);
                this.saveCurrentSettings();
            }
        )
    }

    public onMusicUpdate = () => {
        requestAnimationFrame(
            () => {
                let v = this._musicInput.classList.contains("on");
                Main.MusicManager.musicOn = v;
                this.saveCurrentSettings();
            }
        )
    }

    public onMusicVolumeUpdate = () => {
        let v = parseFloat(this._musicVolumeInput.value) / 100;
        Main.MusicManager.currentVolume = v;
        this.saveCurrentSettings();
    }
}