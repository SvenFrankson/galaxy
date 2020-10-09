class GalaxyTile extends BABYLON.TransformNode {

    constructor(
        public galaxy: Galaxy
    ) {
        super("galaxy-tile");
    }
}

class Galaxy extends BABYLON.TransformNode {

	public templateTile: BABYLON.AbstractMesh;
	public templatePole: BABYLON.AbstractMesh;
	public templateLightning: BABYLON.AbstractMesh;

    public width: number = 5;
    public height: number = 3;
    public depth: number = 4;

    constructor() {
        super("galaxy");
    }

    public async initialize(): Promise<void> {
		this.templateTile = await Main.loadMeshes("tile-lp");
		this.templatePole = await Main.loadMeshes("pole");
		this.templateLightning = await Main.loadMeshes("lightning");
    }

    public instantiate() {
        let x0 = - (this.width - 1) * 0.5 * 2;
        let y0 = - (this.height - 1) * 0.5 * 2;
        let z0 = - (this.depth - 1) * 0.5 * 2;
        let x1 = (this.width - 1) * 0.5 * 2;
        let y1 = (this.height - 1) * 0.5 * 2;
        let z1 = (this.depth - 1) * 0.5 * 2;

        for (let i = 0; i < this.width - 1; i++) {
            for (let j = 0; j < 4; j++) {
                let p0 = this.templatePole.clone("clone", undefined);
                p0.position.copyFromFloats(
                    x0 + i * 2 + 1,
                    j === 0 || j === 3 ? y1 + 1 : y0 - 1,
                    j < 2 ? z0 - 1 : z1 + 1
                );
                p0.rotationQuaternion = undefined;
                p0.rotation.x = - Math.PI / 4 - Math.PI / 2 * j;
            }
        }

        for (let i = 0; i < this.height - 1; i++) {
            for (let j = 0; j < 4; j++) {
                let p0 = this.templatePole.clone("clone", undefined);
                p0.position.copyFromFloats(
                    j < 2 ? x1 + 1 : x0 - 1,
                    y0 + i * 2 + 1,
                    j === 0 || j === 3 ? z0 - 1 : z1 + 1
                );
                p0.rotationQuaternion = undefined;
                p0.rotation.x = - Math.PI / 2;
                p0.rotation.y = - Math.PI / 4 - Math.PI / 2 * j;
            }
        }

        for (let i = 0; i < this.depth - 1; i++) {
            for (let j = 0; j < 4; j++) {
                let p0 = this.templatePole.clone("clone", undefined);
                p0.position.copyFromFloats(
                    j === 0 || j === 3 ? x0 - 1 : x1 + 1,
                    j > 1 ? y0 - 1 : y1 + 1,
                    z0 + i * 2 + 1
                );
                p0.rotationQuaternion = undefined;
                p0.rotation.z = Math.PI / 4 - Math.PI / 2 * j;
            }
        }

        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                let t0 = new GalaxyTile(this);
                t0.position.copyFromFloats(
                    x0 + i * 2,
                    y0 + j * 2,
                    z0 - 1
                );
                t0.rotationQuaternion = undefined;
                t0.rotation.x = - Math.PI * 0.5;
                this.templateTile.clone("clone", t0);
                
                let t1 = new GalaxyTile(this);
                t1.position.copyFromFloats(
                    x0 + i * 2,
                    y0 + j * 2,
                    z1 + 1
                );
                t1.rotation.x = Math.PI * 0.5;
                this.templateTile.clone("clone", t1);

                if (i < this.width - 1 && j < this.height - 1) {
                    let p0 = this.templatePole.clone("clone", undefined);
                    p0.position.copyFromFloats(
                        x0 + i * 2 + 1,
                        y0 + j * 2 + 1,
                        z0 - 1
                    );
                    p0.rotationQuaternion = undefined;
                    p0.rotation.x = - Math.PI * 0.5;
                    
                    let p1 = this.templatePole.clone("clone", undefined);
                    p1.position.copyFromFloats(
                        x0 + i * 2 + 1,
                        y0 + j * 2 + 1,
                        z1 + 1
                    );
                    p1.rotationQuaternion = undefined;
                    p1.rotation.x = Math.PI * 0.5;
                } 
            }
        }
        
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.depth; j++) {
                let t0 = new GalaxyTile(this);
                t0.position.copyFromFloats(
                    x0 + i * 2,
                    y0 - 1,
                    z0 + j * 2
                );
                t0.rotation.x = - Math.PI;
                this.templateTile.clone("clone", t0);
                
                let t1 = new GalaxyTile(this);
                t1.position.copyFromFloats(
                    x0 + i * 2,
                    y1 + 1,
                    z0 + j * 2
                );
                this.templateTile.clone("clone", t1);

                if (i < this.width - 1 && j < this.depth - 1) {
                    let p0 = this.templatePole.clone("clone", undefined);
                    p0.position.copyFromFloats(
                        x0 + i * 2 + 1,
                        y0 - 1,
                        z0 + j * 2 + 1
                    );
                    p0.rotationQuaternion = undefined;
                    p0.rotation.x = Math.PI;
                    
                    let p1 = this.templatePole.clone("clone", undefined);
                    p1.position.copyFromFloats(
                        x0 + i * 2 + 1,
                        y1 + 1,
                        z0 + j * 2 + 1
                    );
                    p1.rotationQuaternion = undefined;
                }
            }
        }
        
        for (let i = 0; i < this.depth; i++) {
            for (let j = 0; j < this.height; j++) {
                let t0 = new GalaxyTile(this);
                t0.position.copyFromFloats(
                    x0 - 1,
                    y0 + j * 2,
                    z0 + i * 2
                );
                t0.rotation.x = - Math.PI * 0.5;
                t0.rotation.y = Math.PI * 0.5;
                this.templateTile.clone("clone", t0);
                
                let t1 = new GalaxyTile(this);
                t1.position.copyFromFloats(
                    x1 + 1,
                    y0 + j * 2,
                    z0 + i * 2
                );
                t1.rotation.x = - Math.PI * 0.5;
                t1.rotation.y = - Math.PI * 0.5;
                this.templateTile.clone("clone", t1);

                if (i < this.depth - 1 && j < this.height - 1) {
                    let p0 = this.templatePole.clone("clone", undefined);
                    p0.position.copyFromFloats(
                        x0 - 1,
                        y0 + j * 2 + 1,
                        z0 + i * 2 + 1
                    );
                    p0.rotationQuaternion = undefined;
                    p0.rotation.x = - Math.PI * 0.5;
                    p0.rotation.y = Math.PI * 0.5;
                    
                    let p1 = this.templatePole.clone("clone", undefined);
                    p1.position.copyFromFloats(
                        x1 + 1,
                        y0 + j * 2 + 1,
                        z0 + i * 2 + 1
                    );
                    p1.rotationQuaternion = undefined;
                    p1.rotation.x = - Math.PI * 0.5;
                    p1.rotation.y = - Math.PI * 0.5;
                }
            }
        }
    }
}