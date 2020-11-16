/// <reference path="GalaxyItem.ts"/>

class Tile extends GalaxyItem {

    public edges: IJK[] = [];
    public neighbours: Tile[] = [];

    private _isValid: ZoneStatus = ZoneStatus.None;
    public get isValid(): ZoneStatus {
        return this._isValid;
    }
    
    private _hasOrb: boolean = false;
    public get hasOrb(): boolean {
        return this._hasOrb && !this.isBlock;
    }
    public setHasOrb(v: boolean): void {
        if (!this.isBlock) {
            this._hasOrb = v;
        }
    }
    public isBlock: boolean = false;
    public orbMesh: BABYLON.Mesh;

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy,
        isBlock: boolean = false
    ) {
        super(i, j, k, galaxy);
        this.name = "tile-" + i + "-" + j + "-" + k;
        this.isBlock = isBlock;

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
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        if (this.isBlock) {
            this.galaxy.templateTileBlock.clone("clone", this);
        }
        else {
            this.galaxy.templateTile.clone("clone", this);
            if (this.hasOrb) {
                this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
                this.orbMesh.parent = this;
                this.orbMesh.position.y = 0.5;
                this.orbMesh.material = Main.orbMaterial;
            }
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

        if (this.isBlock) {
            this.edges.forEach(edgeIJK => {
                let edgeItem = this.galaxy.getItem(edgeIJK);
                if (edgeItem instanceof EdgeBlock) {
                    edgeItem.isLogicalBlock = true;
                    edgeItem.instantiate();
                }
                else {
                    if (edgeItem instanceof Lightning) {
                        edgeItem.dispose();
                        this.galaxy.setItem(undefined, edgeIJK);
                    }
                    let edgeBlock = new EdgeBlock(edgeIJK.i, edgeIJK.j, edgeIJK.k, this.galaxy);
                    edgeBlock.isLogicalBlock = true;
                    edgeBlock.instantiate();
                    this.galaxy.setItem(edgeBlock, edgeIJK);
                }
            });
        }
        else {
            this.edges.forEach(edgeIJK => {
                let edgeItem = this.galaxy.getItem(edgeIJK);
                if (edgeItem instanceof EdgeBlock && edgeItem.isLogicalBlock) {
                    let other = this.getNeighbour(edgeItem.ijk);
                    if (!(other instanceof Tile && other.isBlock)) {
                        edgeItem.dispose();
                        this.galaxy.setItem(undefined, edgeIJK);
                    }
                }
            });
        }
    }

    public setIsValid(v: ZoneStatus): void {
        if (v != this.isValid) {
            this._isValid = v;
            let mesh = this.getChildMeshes()[0].getChildMeshes()[2];
            if (this.isValid === ZoneStatus.None) {
                mesh.material = Main.defaultTileMaterial;
            }
            else if (this.isValid === ZoneStatus.Valid) {
                mesh.material = Main.validTileMaterial;
            }
            else if (this.isValid === ZoneStatus.Invalid) {
                mesh.material = Main.invalidTileMaterial;
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

    public getNeighbour(ijk: IJK, offset: number = 0): Tile {
        let index = this.getEdgeIndex(ijk);
        if (index != -1) {
            index = (index + offset) % 4;
            return this.neighbours[index];
        }
        return undefined;
    }
}