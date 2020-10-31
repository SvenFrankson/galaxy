class IJK {
    
    constructor(
        public i: number,
        public j: number,
        public k: number
    ) {

    }

    public isEqual(other: IJK): boolean {
        return this.i === other.i && this.j === other.j && this.k === other.k;
    }

    public isTile(): boolean {
        let odds = 0;
        if (this.i % 2 === 1) {
            odds++;
        }
        if (this.j % 2 === 1) {
            odds++;
        }
        if (this.k % 2 === 1) {
            odds++;
        }
        return odds === 2;
    }

    public forEachAround(callback: (ijk: IJK) => void): void {
        callback(new IJK(this.i - 1, this.j, this.k));
        callback(new IJK(this.i, this.j - 1, this.k));
        callback(new IJK(this.i, this.j, this.k - 1));
        callback(new IJK(this.i + 1, this.j, this.k));
        callback(new IJK(this.i, this.j + 1, this.k));
        callback(new IJK(this.i, this.j, this.k + 1));
    }
}

class Galaxy extends BABYLON.TransformNode {

	public templateTile: BABYLON.AbstractMesh;
	public templatePole: BABYLON.AbstractMesh;
	public templatePoleEdge: BABYLON.AbstractMesh;
	public templatePoleCorner: BABYLON.AbstractMesh;
	public templateLightning: BABYLON.AbstractMesh;

    public width: number = 10;
    public height: number = 6;
    public depth: number = 8;

    public items: GalaxyItem[][][];
    public tiles: Tile[];
    public zones: Tile[][];

    constructor() {
        super("galaxy");
    }

    public isIJKValid(ijk: IJK): boolean {
        if (ijk.i === 0 || ijk.i === this.width || ijk.j === 0 || ijk.j === this.height || ijk.k === 0 || ijk.k === this.depth) {
            if (ijk.i >= 0 && ijk.i <= this.width && ijk.j >= 0 && ijk.j <= this.height && ijk.k >= 0 && ijk.k <= this.depth) {
                return true;
            }
        }
        return false;
    }

    public async initialize(): Promise<void> {
		this.templateTile = await Main.loadMeshes("tile-lp");
		this.templatePole = await Main.loadMeshes("pole");
		this.templatePoleEdge = await Main.loadMeshes("pole");
		this.templatePoleCorner = await Main.loadMeshes("pole");
		this.templateLightning = await Main.loadMeshes("lightning");
    }

    public instantiate() {
        this.position.copyFromFloats(
            - this.width * 0.5,
            - this.height * 0.5,
            - this.depth * 0.5
        );
        this.items = [];
        this.tiles = [];
        for (let i = 0; i <= this.width; i++) {
            this.items[i] = [];
            for (let j = 0; j <= this.height; j++) {
                this.items[i][j] = [];
                for (let k = 0; k <= this.depth; k++) {
                    let item = GalaxyItem.Create(i, j, k, this);
                    if (item) {
                        this.items[i][j][k] = item;
                        if (item instanceof Tile) {
                            this.tiles.push(item);
                            item.hasOrb = Math.random() < 0.05;
                        }
                        item.instantiate();
                    }
                }
            }
        }

        for (let i = 0; i <= this.width; i++) {
            for (let j = 0; j <= this.height; j++) {
                for (let k = 0; k <= this.depth; k++) {
                    let item = this.getItem(i, j, k);
                    if (item && item instanceof Tile) {
                        item.updateNeighbours();
                        if (item.neighbours.length != 4) {
                            console.log("Potentiel error with neighbour detection. " + item.neighbours.length + " detected. Expected 4.");
                            console.log("Check " + i + " " + j + " " + k);
                        }
                    }
                }
            }
        }

        Main.Scene.onPointerObservable.add((eventData: BABYLON.PointerInfo) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this.onPointerDown();
            }
        });
    }

    public updateZones(): void {
        this.zones = [];
        let tiles = [...this.tiles];
        while (tiles.length > 0) {
            let tile = tiles.pop();
            let zone = [];
            this.addToZone(zone, tile, tiles);
            this.zones.push(zone);
        }

        for (let i = 0; i < this.zones.length; i++) {
            let zone = this.zones[i];
            if (this.isZoneValid(zone)) {
                zone.forEach(t => {
                    t.setIsValid(true);
                })
            }
            else {
                zone.forEach(t => {
                    t.setIsValid(false);
                })
            }
        }
    }

    public isZoneValid(zone: Tile[]): boolean {
        let orbTile: Tile;
        for (let i = 0; i < zone.length; i++) {
            let tile = zone[i];
            if (tile.hasOrb) {
                if (!orbTile) {
                    orbTile = tile;
                }
                else {
                    return false;
                }
            }
        }
        if (orbTile) {
            let e0 = orbTile.edges[0];
            let border0 = this.getItem(e0);
            let e2 = orbTile.edges[2];
            let border2 = this.getItem(e2);
            let e1 = orbTile.edges[1];
            let border1 = this.getItem(e1);
            let e3 = orbTile.edges[3];
            let border3 = this.getItem(e3);

            if (border0 && border2 || !border0 && !border2) {
                if (border1 && border3 || !border1 && !border3) {
                    return true;
                }
            }
        }
        return false;
    }

    private addToZone(zone: Tile[], tile: Tile, tiles: Tile[]): void {
        if (zone.indexOf(tile) === -1) {
            zone.push(tile);
        }
        for (let i = 0; i < tile.neighbours.length; i++) {
            let edge = tile.edges[i];
            if (!this.getItem(edge)) {
                let other = tile.neighbours[i];
                let index = tiles.indexOf(other);
                if (index != -1) {
                    tiles.splice(index, 1);
                    this.addToZone(zone, other, tiles);
                }
            }
        }
    }

    public getItem(ijk: IJK): GalaxyItem;
    public getItem(i: number, j: number, k: number): GalaxyItem;
    public getItem(a: IJK | number, j?: number, k?: number) : GalaxyItem {
        let i: number;
        if (a instanceof IJK) {
            i = a.i;
            j = a.j;
            k = a.k;
        }
        else {
            i = a;
        }
        if (this.items[i]) {
            if (this.items[i][j]) {
                return this.items[i][j][k];
            }
        }
    }

    public setItem(ijk: IJK, item: GalaxyItem): void {
        this.items[ijk.i][ijk.j][ijk.k] = item;
    }

    public toggleBorder(ijk: IJK): void {
        let item = this.getItem(ijk);
        if (item) {
            item.dispose();
            this.setItem(ijk, undefined);
        }
        else {
            let border = new Border(ijk.i, ijk.j, ijk.k, this);
            border.instantiate();
            this.setItem(ijk, border);
        }
    }

    public worldPositionToIJK(worldPosition: BABYLON.Vector3): IJK {
        let i = Math.round(worldPosition.x + this.width * 0.5);
        let j = Math.round(worldPosition.y + this.height * 0.5);
        let k = Math.round(worldPosition.z + this.depth * 0.5);
        
        return new IJK(i, j, k);
    }

    public onPointerDown() {
        let pick = Main.Scene.pick(
            Main.Scene.pointerX,
            Main.Scene.pointerY
        );
        if (pick && pick.hit) {
            let ijk = this.worldPositionToIJK(pick.pickedPoint);
            
            let odds = 0;
            if (ijk.i % 2 === 1) {
                odds++;
            }
            if (ijk.j % 2 === 1) {
                odds++;
            }
            if (ijk.k % 2 === 1) {
                odds++;
            }

            if (odds === 1) {
                this.toggleBorder(ijk);
                this.updateZones();
            }
        }
    }
}