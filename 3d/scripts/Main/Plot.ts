class Plot extends GalaxyItem {

    public poleType: number = 0;

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy
    ) {
        super(i, j, k, galaxy);
        this.name = "plot-" + i + "-" + j + "-" + k;
        let edges = 0;
        if (this.i === 0 || this.i === this.galaxy.width) {
            edges++;
        }
        if (this.j === 0 || this.j === this.galaxy.height) {
            edges++;
        }
        if (this.k === 0 || this.k === this.galaxy.depth) {
            edges++;
        }

        if (edges === 1) {
            this.poleType = 0;
        }
        if (edges === 2) {
            this.poleType = 1;
        }
        if (edges === 3) {
            this.poleType = 2;
        }
    }

    public instantiate(): void {
        
    }
}