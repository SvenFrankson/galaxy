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