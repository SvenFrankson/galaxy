/// <reference path="GalaxyItem.ts"/>

var DEBUG_SHOW_LOGICAL_EDGEBLOCK = false;

abstract class Border extends GalaxyItem {

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
        let stretch: boolean = false;
        if (this.i === 1) {
            this.position.x -= 0.1;
            stretch = true;
        }
        if (this.i === galaxy.width - 1) {
            this.position.x += 0.1;
            stretch = true;
        }
        if (this.j === 1) {
            this.position.y -= 0.1;
            stretch = true;
        }
        if (this.j === galaxy.height - 1) {
            this.position.y += 0.1;
            stretch = true;
        }
        if (this.k === 1) {
            this.position.z -= 0.1;
            stretch = true;
        }
        if (this.k === galaxy.depth - 1) {
            this.position.z += 0.1;
            stretch = true;
        }
        if (stretch) {
            this.scaling.z = 1.1;
        }
    }

    public abstract instantiate(): void;

    public updateRotation(): void {
        super.updateRotation();
        Border.UpdateRotationToRef(this.ijk, this.galaxy, this.rotationQuaternion);
    }

    public static UpdateRotationToRef(ijk: IJK, galaxy: Galaxy, quaternionRef: BABYLON.Quaternion): void {
        if (ijk.i === 0 || ijk.i === galaxy.width || ijk.k === 0 || ijk.k === galaxy.depth) {
            if (ijk.j % 2 === 1) {
                let q = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.PI * 0.5);
                quaternionRef.multiplyInPlace(q);
            }
        }
        else {
            if (ijk.i % 2 === 1) {
                let q = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.PI * 0.5);
                quaternionRef.multiplyInPlace(q);
            }
        }
    }
}

class EdgeOrb extends Border {
    
    public orbMesh: BABYLON.Mesh;

    public instantiate(): void {
        if (this.orbMesh) {
            this.orbMesh.dispose();
            this.orbMesh = undefined;
        }
        this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
        this.orbMesh.parent = this;
        this.orbMesh.position.y = 0.5;
        this.orbMesh.material = Main.orbMaterial;
    }
}

class Lightning extends Border {

    private smorb: BABYLON.Mesh;
    private _speed: number = 2;

    public instantiate(): void {
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        this.galaxy.templateLightning.createInstance("clone").parent = this;

        if (this.smorb) {
            this.smorb.dispose();
        }
        this.smorb = BABYLON.MeshBuilder.CreateIcoSphere("smorb", { radius: 0.04, subdivisions: 1 }, Main.Scene);
        this.smorb.position.z = - 2 + 4 * Math.random();
        this.smorb.parent = this;
        this.smorb.material = this.galaxy.templateLightning.material;

        this._speed = 1.5 + Math.random();
        
        this.freezeWorldMatrix();
        Main.Scene.onBeforeRenderObservable.add(this._update);
    }

    public dispose(doNotRecurse?: boolean, disposeMaterialAndTextures?: boolean): void {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        Main.Scene.onBeforeRenderObservable.removeCallback(this._update);
    }

    private _update = () => {
        let dt = Main.Engine.getDeltaTime() / 1000;
        /*
        for (let i = 0; i < this.getChildren().length; i++) {
            if (Math.random() < dt * 60) {
                let child = this.getChildren()[0];
                if (child instanceof BABYLON.AbstractMesh) {
                    child.rotation.z = Math.random() * Math.PI * 2;
                }
            }
        }
        */
        this.smorb.position.z += this._speed * dt;
        this.smorb.position.x = 0.02 * Math.sin(8 * 2 * Math.PI * this.smorb.position.z);
        this.smorb.position.y = 0.02 * Math.cos(9 * 2 * Math.PI * this.smorb.position.z);
        if (Math.abs(this.smorb.position.z) < 0.95) {
            this.smorb.isVisible = true;
        }
        else {
            this.smorb.isVisible = false;
        }
        if (this.smorb.position.z > 4) {
            this.smorb.position.z = - 4;
        }
        this.freezeWorldMatrix();
    }
}

class EdgeBlock extends Border {

    public isGeneratedByTile: boolean = false;

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy
    ) {
        super(i, j, k, galaxy);
    }

    public instantiate(): void {}
}