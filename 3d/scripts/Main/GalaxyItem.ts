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
        this.position.copyFromFloats(
            i - 0.5 * this.galaxy.width,
            j - 0.5 * this.galaxy.height,
            k - 0.5 * this.galaxy.depth
        );
        this.updateRotation();
    }

    public abstract instantiate();

    public updateRotation(): void {
        if (!this.rotationQuaternion) {
            this.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
        GalaxyItem.UpdateRotationToRef(this.ijk, this.galaxy, this.rotationQuaternion);
    }

    public static UpdateRotationToRef(ijk: IJK, galaxy: Galaxy, quaternionRef: BABYLON.Quaternion): void {
        let up = BABYLON.Vector3.Zero();
        if (ijk.i === 0) {
            up.x = - 1;
        }
        else if (ijk.i === galaxy.width) {
            up.x = 1;
        }
        if (ijk.j === 0) {
            up.y = - 1;
        }
        else if (ijk.j === galaxy.height) {
            up.y = 1;
        }
        if (ijk.k === 0) {
            up.z = - 1;
        }
        else if (ijk.k === galaxy.depth) {
            up.z = 1;
        }
        up.normalize();
        if (up.y === 1) {
            quaternionRef.copyFrom(BABYLON.Quaternion.Identity());
        }
        else if (up.y === -1) {
            BABYLON.Quaternion.RotationAxisToRef(BABYLON.Axis.Z, Math.PI, quaternionRef);
        }
        else {
            let forward = BABYLON.Vector3.Cross(up, BABYLON.Axis.Y).normalize();
            let right = BABYLON.Vector3.Cross(up, forward).normalize();
            BABYLON.Quaternion.RotationQuaternionFromAxisToRef(right, up, forward, quaternionRef);
        }
    }
}