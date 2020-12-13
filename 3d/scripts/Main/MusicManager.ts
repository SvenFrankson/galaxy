class MusicManager {

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
        await this.pauseCurrent(transitionDuration);
        this.currentMusic = track;
        await this.playCurrent(transitionDuration);
    }

    // Linearly increase volume for -duration- miliseconds, then pause. 
    public async playCurrent(transitionDuration: number = 1000): Promise<void> {
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
                    currentMusic.volume = t / transitionDuration;
                }
                else {
                    currentMusic.volume = 1;
                    Main.Scene.onBeforeRenderObservable.removeCallback(update);
                    resolve();
                }
            }
            Main.Scene.onBeforeRenderObservable.add(update);
        });
    }

    // Linearly decrease volume for -duration- miliseconds, then pause. 
    public async pauseCurrent(transitionDuration: number = 1000): Promise<void> {
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
                    currentMusic.volume = 1 - t / transitionDuration;
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