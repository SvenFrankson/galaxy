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

class Lightning extends Border {

    public instantiate(): void {
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        this.galaxy.templateLightning.createInstance("clone").parent = this;
        this.freezeWorldMatrix();
    }
}

class EdgeBlock extends Border {

    public isLogicalBlock: boolean = false;

    constructor(
        i: number,
        j: number,
        k: number,
        galaxy: Galaxy
    ) {
        super(i, j, k, galaxy);
    }

    public instantiate(): void {
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        if (!this.isLogicalBlock) {
            this.galaxy.templateEdgeBlock.createInstance("clone").parent = this;
        }
        if (this.isLogicalBlock && DEBUG_SHOW_LOGICAL_EDGEBLOCK) {
            let edgeBlock = BABYLON.MeshBuilder.CreateBox("edge-block", { width: 0.1, height: 0.5, depth: 1.8 });
            edgeBlock.material = Main.redMaterial;
            edgeBlock.visibility = 0.5;
            edgeBlock.parent = this;
            this.deepFreezeWorldMatrix();
        }
    }
}