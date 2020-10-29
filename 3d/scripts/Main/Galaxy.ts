interface IJK {
    i: number,
    j: number,
    k: number
}

class GalaxyTile extends BABYLON.TransformNode {

    constructor(
        public galaxy: Galaxy
    ) {
        super("galaxy-tile");
    }
}

abstract class GalaxyItem extends BABYLON.Mesh {

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

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy
    ) {
        super(i, j, k, galaxy);
        this.name = "tile-" + i + "-" + j + "-" + k;
    }

    public instantiate(): void {
        this.galaxy.templateTile.clone("clone", this);
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

        Main.Scene.onPointerObservable.add((eventData: BABYLON.PointerInfo) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this.onPointerDown();
            }
        });
    }

    public getItem(ijk: IJK): GalaxyItem {
        return this.items[ijk.i][ijk.j][ijk.k];
    }

    public setItem(ijk: IJK, item: GalaxyItem): void {
        this.items[ijk.i][ijk.j][ijk.k] = item;
    }

    public worldPositionToIJK(worldPosition: BABYLON.Vector3): IJK {
        let i = Math.round(worldPosition.x + this.width * 0.5);
        let j = Math.round(worldPosition.y + this.height * 0.5);
        let k = Math.round(worldPosition.z + this.depth * 0.5);
        
        return { i: i, j: j, k: k};
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
        }
    }
}