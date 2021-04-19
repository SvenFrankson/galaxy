class MusicManager {

    private _musicOn: boolean = true;
    public get musicOn(): boolean {
        return this._musicOn;
    }
    public set musicOn(v: boolean) {
        this._musicOn = v;
        if (!this.musicOn) {
            if (this.getCurrentMusic()) {
                this.getCurrentMusic().volume = 0;
            }
        }
        else {
            if (this.getCurrentMusic()) {
                this.getCurrentMusic().volume = this.currentVolume;
            }
        }
    }

    private _currentVolume: number = 100;
    public get currentVolume(): number {
        return this._currentVolume;
    }
    public set currentVolume(v) {
        this._currentVolume = v;
        if (this.getCurrentMusic()) {
            this.getCurrentMusic().volume = this._musicOn ? v : 0;
        }
    }
    public currentMusic: number = -1;
    public musics: HTMLAudioElement[] = [];

    constructor () {
        for (let i = 1; i <= 3; i++) {
            this.musics.push(new Audio("assets/musics/galaxies-" + i + ".mp3"));
        }
    }

    public getCurrentMusic(): HTMLAudioElement {
        return this.musics[this.currentMusic];
    }

    public async play(track: number, transitionDuration: number = 1000): Promise<void> {
        await this._pauseCurrent(transitionDuration);
        this.currentMusic = track;
        await this._playCurrent(transitionDuration);
    }

    // Linearly increase volume for -duration- miliseconds, then pause. 
    private async _playCurrent(transitionDuration: number = 1000): Promise<void> {
        let currentMusic = this.getCurrentMusic();
        if (!currentMusic) {
            return;
        }
        return new Promise<void>(resolve => {
            let t = 0;
            currentMusic.play();
            currentMusic.loop = true;
            currentMusic.volume = 0;
            let update = () => {
                let dt = Main.Engine.getDeltaTime();
                t += dt;
                if (t < transitionDuration) {
                    currentMusic.volume = t / transitionDuration * (this._musicOn ? this.currentVolume : 0);
                }
                else {
                    currentMusic.volume = (this._musicOn ? this.currentVolume : 0);
                    Main.Scene.onBeforeRenderObservable.removeCallback(update);
                    resolve();
                }
            }
            Main.Scene.onBeforeRenderObservable.add(update);
        });
    }

    // Linearly decrease volume for -duration- miliseconds, then pause. 
    private async _pauseCurrent(transitionDuration: number = 1000): Promise<void> {
        let currentMusic = this.getCurrentMusic();
        if (!currentMusic) {
            return;
        }
        return new Promise<void>(resolve => {
            let t = 0;
            let update = () => {
                let dt = Main.Engine.getDeltaTime();
                t += dt;
                if (t < transitionDuration) {
                    currentMusic.volume = (1 - t / transitionDuration) * (this._musicOn ? this.currentVolume : 0);
                }
                else {
                    currentMusic.volume = 0;
                    currentMusic.pause();
                    Main.Scene.onBeforeRenderObservable.removeCallback(update);
                    resolve();
                }
            }
            Main.Scene.onBeforeRenderObservable.add(update);
        });
    }
}