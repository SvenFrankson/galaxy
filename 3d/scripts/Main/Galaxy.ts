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

class GalaxyTile extends BABYLON.TransformNode {

    constructor(
        public galaxy: Galaxy
    ) {
        super("galaxy-tile");
    }
}

abstract class GalaxyItem extends BABYLON.Mesh {

    private _ijk: IJK;
    public get ijk() {
        return this._ijk;
    }

    public static Create(i: number, j: number, k: number, galaxy: Galaxy): GalaxyItem {
        let W = galaxy.width;
        let H = galaxy.height;
        let D = galaxy.depth;
        if (i === 0 || i === W || j === 0 || j === H || k === 0 || k === D) {
            let odds = 0;
            if (i % 2 === 1) {
                odds++;
            }
            if (j % 2 === 1) {
                odds++;
            }
            if (k % 2 === 1) {
                odds++;
            }
            if (odds === 0) {
                return new Plot(i, j, k, galaxy);
            }
            else if (odds === 1) {
                //return new Border(i, j, k, galaxy);
            }
            else if (odds === 2) {
                return new Tile(i, j, k, galaxy);
            }
        }
        return undefined;
    }

    constructor(
        public i: number,
        public j: number,
        public k: number,
        public galaxy: Galaxy
    ) {
        super("galaxy-item");
        this._ijk = new IJK(i, j, k);
        this.parent = galaxy;
        this.position.copyFromFloats(i, j, k);
        this.updateRotation();
    }

    public abstract instantiate();

    public updateRotation(): void {
        let up = BABYLON.Vector3.Zero();
        if (this.i === 0) {
            up.x = - 1;
        }
        else if (this.i === this.galaxy.width) {
            up.x = 1;
        }
        if (this.j === 0) {
            up.y = - 1;
        }
        else if (this.j === this.galaxy.height) {
            up.y = 1;
        }
        if (this.k === 0) {
            up.z = - 1;
        }
        else if (this.k === this.galaxy.depth) {
            up.z = 1;
        }
        up.normalize();
        if (up.y === 1) {
            this.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
        else if (up.y === -1) {
            this.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Z, Math.PI);
        }
        else {
            let forward = BABYLON.Vector3.Cross(up, BABYLON.Axis.Y).normalize();
            let right = BABYLON.Vector3.Cross(up, forward).normalize();
            this.rotationQuaternion = BABYLON.Quaternion.RotationQuaternionFromAxis(right, up, forward);
        }
    }
}

class Tile extends GalaxyItem {

    public edges: IJK[] = [];
    public neighbours: Tile[] = [];

    private _isValid: boolean = false;
    public isValidMesh: BABYLON.Mesh;
    public get isValid(): boolean {
        return this._isValid;
    }

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
        let ei1 = new IJK(this.i + 1, this.j, this.k);
        if (this.galaxy.isIJKValid(ei1)) {
            this.edges.push(ei1);
        }
        let ej0 = new IJK(this.i, this.j - 1, this.k);
        if (this.galaxy.isIJKValid(ej0)) {
            this.edges.push(ej0);
        }
        let ej1 = new IJK(this.i, this.j + 1, this.k);
        if (this.galaxy.isIJKValid(ej1)) {
            this.edges.push(ej1);
        }
        let ek0 = new IJK(this.i, this.j, this.k - 1);
        if (this.galaxy.isIJKValid(ek0)) {
            this.edges.push(ek0);
        }
        let ek1 = new IJK(this.i, this.j, this.k + 1);
        if (this.galaxy.isIJKValid(ek1)) {
            this.edges.push(ek1);
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
    }

    public setIsValid(v: boolean): void {
        if (v != this.isValid) {
            if (this.isValid) {
                if (this.isValidMesh) {
                    this.isValidMesh.dispose();
                    this.isValidMesh = undefined;
                }
            }
            else {
                this.isValidMesh = BABYLON.MeshBuilder.CreatePlane("", { size: 1.8 }, Main.Scene);
                this.isValidMesh.parent = this;
                this.isValidMesh.position.y = 0.05;
                this.isValidMesh.rotation.x = Math.PI * 0.5;
                this.isValidMesh.material = Main.greenMaterial;
            }
            this._isValid = v;
        }
    }
}

class Border extends GalaxyItem {

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy
    ) {
        super(i, j, k, galaxy);
        this.name = "border-" + i + "-" + j + "-" + k;
        let up = this.getDirection(BABYLON.Axis.Y);
        this.position.addInPlace(up.scale(0.25));
    }

    public instantiate(): void {
        this.galaxy.templateLightning.clone("clone", this);
    }

    public updateRotation(): void {
        super.updateRotation();
        if (this.i === 0 || this.i === this.galaxy.width || this.k === 0 || this.k === this.galaxy.depth) {
            if (this.j % 2 === 1) {
                let q = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.PI * 0.5);
                this.rotationQuaternion.multiplyInPlace(q);
            }
        }
        else {
            if (this.i % 2 === 1) {
                let q = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.PI * 0.5);
                this.rotationQuaternion.multiplyInPlace(q);
            }
        }
    }
}

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
            this.galaxy.templatePole.clone("clone", this);
        }
        if (edges === 2) {
            this.galaxy.templatePoleEdge.clone("clone", this);
        }
        if (edges === 3) {
            this.galaxy.templatePoleCorner.clone("clone", this);
        }
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
        for (let i = 0; i <= this.width; i++) {
            this.items[i] = [];
            for (let j = 0; j <= this.height; j++) {
                this.items[i][j] = [];
                for (let k = 0; k <= this.depth; k++) {
                    let item = GalaxyItem.Create(i, j, k, this);
                    if (item) {
                        this.items[i][j][k] = item;
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
            else if (odds === 2) {
                let item = this.getItem(ijk) as Tile;
                item.setIsValid(!item.isValid);
                item.neighbours.forEach(t => {
                    t.setIsValid(!t.isValid);
                })
            }
        }
    }
}