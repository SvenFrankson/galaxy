class Plot extends GalaxyItem {

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy
    ) {
        super(i, j, k, galaxy);
        this.name = "plot-" + i + "-" + j + "-" + k;
    }

    public instantiate(): void {
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
            this.galaxy.templatePole.createInstance("clone").parent = this;
        }
        if (edges === 2) {
            this.galaxy.templatePoleEdge.createInstance("clone").parent = this;
        }
        if (edges === 3) {
            this.galaxy.templatePoleCorner.createInstance("clone").parent = this;
        }
        this.deepFreezeWorldMatrix();
    }
}