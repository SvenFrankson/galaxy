/// <reference path="GalaxyItem.ts"/>

class Tile extends GalaxyItem {

    public edges: IJK[] = [];
    public neighbours: Tile[] = [];

    private _isValid: ZoneStatus = ZoneStatus.None;
    public isValidMesh: BABYLON.Mesh;
    public get isValid(): ZoneStatus {
        return this._isValid;
    }
    
    public hasOrb: boolean = false;
    public orbMesh: BABYLON.Mesh;

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy
    ) {
        super(i, j, k, galaxy);
        this.name = "tile-" + i + "-" + j + "-" + k;

        let ei0 = new IJK(this.i - 1, this.j, this.k);
        if (this.galaxy.isIJKValid(ei0)) {
            this.edges.push(ei0);
        }
        let ek0 = new IJK(this.i, this.j, this.k - 1);
        if (this.galaxy.isIJKValid(ek0)) {
            this.edges.push(ek0);
        }
        let ej0 = new IJK(this.i, this.j - 1, this.k);
        if (this.galaxy.isIJKValid(ej0)) {
            this.edges.push(ej0);
        }
        let ei1 = new IJK(this.i + 1, this.j, this.k);
        if (this.galaxy.isIJKValid(ei1)) {
            this.edges.push(ei1);
        }
        let ek1 = new IJK(this.i, this.j, this.k + 1);
        if (this.galaxy.isIJKValid(ek1)) {
            this.edges.push(ek1);
        }
        let ej1 = new IJK(this.i, this.j + 1, this.k);
        if (this.galaxy.isIJKValid(ej1)) {
            this.edges.push(ej1);
        }

        if (this.i === this.galaxy.width || this.j === this.galaxy.height || this.k === 0) {
            this.edges = [
                this.edges[3],
                this.edges[2],
                this.edges[1],
                this.edges[0]
            ]
        }
    }

    public updateNeighbours(): void {
        this.neighbours = [];
        for (let i = 0; i < this.edges.length; i++) {
            let e = this.edges[i];
            e.forEachAround(ijk => {
                if (this.galaxy.isIJKValid(ijk)) {
                    if (ijk.isTile()) {
                        if (!ijk.isEqual(this.ijk)) {
                            this.neighbours.push(this.galaxy.getItem(ijk) as Tile);
                        }
                    }
                }
            })
        }
    }

    public instantiate(): void {
        this.galaxy.templateTile.clone("clone", this);
        if (this.hasOrb) {
            this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
            this.orbMesh.parent = this;
            this.orbMesh.position.y = 0.5;
            this.orbMesh.material = Main.orbMaterial;
        }
        this.freezeWorldMatrix();
    }

    public refresh(): void {
        if (this.orbMesh) {
            this.orbMesh.dispose();
            this.orbMesh = undefined;
        }
        if (this.hasOrb) {
            this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
            this.orbMesh.parent = this;
            this.orbMesh.position.y = 0.5;
            this.orbMesh.material = Main.orbMaterial;
        }
    }

    public setIsValid(v: ZoneStatus): void {
        if (v != this.isValid) {
            if (this.isValidMesh) {
                this.isValidMesh.dispose();
                this.isValidMesh = undefined;
            }
            this._isValid = v;
            if (this.isValid != ZoneStatus.None) {
                this.isValidMesh = BABYLON.MeshBuilder.CreatePlane("", { size: 1.8 }, Main.Scene);
                this.isValidMesh.parent = this;
                this.isValidMesh.position.y = 0.05;
                this.isValidMesh.rotation.x = Math.PI * 0.5;
                if (this.isValid === ZoneStatus.Valid) {
                    this.isValidMesh.material = Main.greenMaterial;
                }
                else if (this.isValid === ZoneStatus.Invalid) {
                    this.isValidMesh.material = Main.redMaterial;
                }
            }
        }
    }

    public getFootPrint(ijk: IJK): string {
        let i0 = this.edges.findIndex(e => { return e.isEqual(ijk); });
        let footprint = "";
        for (let i = 1; i <= 3; i++) {
            footprint += this.galaxy.getItem(this.edges[(i0 + i) % 4]) ? "0" : "1";
        }
        return footprint;
    }

    public getEdgeIndex(ijk: IJK): number {
        for (let i = 0; i < this.edges.length; i++) {
            if (this.edges[i].isEqual(ijk)) {
                return i;
            }
        }
        return -1;
    }

    public getNextEdge(ijk: IJK, offset: number = 1): IJK {
        let index = this.getEdgeIndex(ijk);
        if (index != -1) {
            index = (index + offset) % 4;
            return this.edges[index];
        }
        return undefined;
    }

    public getNeighbour(ijk: IJK, offset: number): Tile {
        let index = this.getEdgeIndex(ijk);
        if (index != -1) {
            index = (index + offset) % 4;
            return this.neighbours[index];
        }
        return undefined;
    }
}