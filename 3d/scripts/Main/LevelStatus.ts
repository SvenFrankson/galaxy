class LevelStatus {

    private static _instance: LevelStatus;
    public static get instance(): LevelStatus {
        if (!LevelStatus._instance) {
            LevelStatus._instance = new LevelStatus();
        }
        return LevelStatus._instance;
    }

    public isLevelSolved(level: number): boolean {
        let s = localStorage.getItem("level-status-" + level.toFixed(0));
        let v = parseInt(s);
        if (isFinite(v) && v > 0) {
            return true;
        }
        return false;
    }

    public setLevelStatus(level: number, status: boolean): void {
        if (status) {
            localStorage.setItem("level-status-" + level.toFixed(0), "1");
        }
        else {
            localStorage.setItem("level-status-" + level.toFixed(0), "0");
        }
    }

    public setAllLevelsStatus(status: boolean): void {
        for (let i = 1; i <= LEVEL_COUNT; i++) {
            this.setLevelStatus(i, status);
        }
    }
}