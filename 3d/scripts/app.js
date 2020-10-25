class VMath {
    // Method adapted from gre's work (https://github.com/gre/bezier-easing). Thanks !
    static easeOutElastic(t, b = 0, c = 1, d = 1) {
        var s = 1.70158;
        var p = 0;
        var a = c;
        if (t == 0) {
            return b;
        }
        if ((t /= d) == 1) {
            return b + c;
        }
        if (!p) {
            p = d * .3;
        }
        if (a < Math.abs(c)) {
            a = c;
            s = p / 4;
        }
        else {
            s = p / (2 * Math.PI) * Math.asin(c / a);
        }
        return a * Math.pow(2, -10 * t) * Math.sin((t * d - s) * (2 * Math.PI) / p) + c + b;
    }
    static ProjectPerpendicularAt(v, at) {
        let p = BABYLON.Vector3.Zero();
        let k = (v.x * at.x + v.y * at.y + v.z * at.z);
        k = k / (at.x * at.x + at.y * at.y + at.z * at.z);
        p.copyFrom(v);
        p.subtractInPlace(at.multiplyByFloats(k, k, k));
        return p;
    }
    static Angle(from, to) {
        let pFrom = BABYLON.Vector3.Normalize(from);
        let pTo = BABYLON.Vector3.Normalize(to);
        let angle = Math.acos(BABYLON.Vector3.Dot(pFrom, pTo));
        return angle;
    }
    static AngleFromToAround(from, to, around) {
        let pFrom = VMath.ProjectPerpendicularAt(from, around).normalize();
        let pTo = VMath.ProjectPerpendicularAt(to, around).normalize();
        let angle = Math.acos(BABYLON.Vector3.Dot(pFrom, pTo));
        if (BABYLON.Vector3.Dot(BABYLON.Vector3.Cross(pFrom, pTo), around) < 0) {
            angle = -angle;
        }
        return angle;
    }
    static CatmullRomPath(path) {
        let interpolatedPoints = [];
        for (let i = 0; i < path.length; i++) {
            let p0 = path[(i - 1 + path.length) % path.length];
            let p1 = path[i];
            let p2 = path[(i + 1) % path.length];
            let p3 = path[(i + 2) % path.length];
            interpolatedPoints.push(BABYLON.Vector3.CatmullRom(p0, p1, p2, p3, 0.5));
        }
        for (let i = 0; i < interpolatedPoints.length; i++) {
            path.splice(2 * i + 1, 0, interpolatedPoints[i]);
        }
    }
}
class GalaxyTile extends BABYLON.TransformNode {
    constructor(galaxy) {
        super("galaxy-tile");
        this.galaxy = galaxy;
    }
}
class Galaxy extends BABYLON.TransformNode {
    constructor() {
        super("galaxy");
        this.width = 5;
        this.height = 3;
        this.depth = 4;
    }
    async initialize() {
        this.templateTile = await Main.loadMeshes("tile-lp-test-2");
        this.templatePole = await Main.loadMeshes("pole");
        this.templateLightning = await Main.loadMeshes("lightning");
    }
    instantiate() {
        let x0 = -(this.width - 1) * 0.5 * 2;
        let y0 = -(this.height - 1) * 0.5 * 2;
        let z0 = -(this.depth - 1) * 0.5 * 2;
        let x1 = (this.width - 1) * 0.5 * 2;
        let y1 = (this.height - 1) * 0.5 * 2;
        let z1 = (this.depth - 1) * 0.5 * 2;
        for (let i = 0; i < this.width - 1; i++) {
            for (let j = 0; j < 4; j++) {
                let p0 = this.templatePole.clone("clone", undefined);
                p0.position.copyFromFloats(x0 + i * 2 + 1, j === 0 || j === 3 ? y1 + 1 : y0 - 1, j < 2 ? z0 - 1 : z1 + 1);
                p0.rotationQuaternion = undefined;
                p0.rotation.x = -Math.PI / 4 - Math.PI / 2 * j;
            }
        }
        for (let i = 0; i < this.height - 1; i++) {
            for (let j = 0; j < 4; j++) {
                let p0 = this.templatePole.clone("clone", undefined);
                p0.position.copyFromFloats(j < 2 ? x1 + 1 : x0 - 1, y0 + i * 2 + 1, j === 0 || j === 3 ? z0 - 1 : z1 + 1);
                p0.rotationQuaternion = undefined;
                p0.rotation.x = -Math.PI / 2;
                p0.rotation.y = -Math.PI / 4 - Math.PI / 2 * j;
            }
        }
        for (let i = 0; i < this.depth - 1; i++) {
            for (let j = 0; j < 4; j++) {
                let p0 = this.templatePole.clone("clone", undefined);
                p0.position.copyFromFloats(j === 0 || j === 3 ? x0 - 1 : x1 + 1, j > 1 ? y0 - 1 : y1 + 1, z0 + i * 2 + 1);
                p0.rotationQuaternion = undefined;
                p0.rotation.z = Math.PI / 4 - Math.PI / 2 * j;
            }
        }
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                let t0 = new GalaxyTile(this);
                t0.position.copyFromFloats(x0 + i * 2, y0 + j * 2, z0 - 1);
                t0.rotationQuaternion = undefined;
                t0.rotation.x = -Math.PI * 0.5;
                this.templateTile.clone("clone", t0);
                let t1 = new GalaxyTile(this);
                t1.position.copyFromFloats(x0 + i * 2, y0 + j * 2, z1 + 1);
                t1.rotation.x = Math.PI * 0.5;
                this.templateTile.clone("clone", t1);
                if (i < this.width - 1 && j < this.height - 1) {
                    let p0 = this.templatePole.clone("clone", undefined);
                    p0.position.copyFromFloats(x0 + i * 2 + 1, y0 + j * 2 + 1, z0 - 1);
                    p0.rotationQuaternion = undefined;
                    p0.rotation.x = -Math.PI * 0.5;
                    let p1 = this.templatePole.clone("clone", undefined);
                    p1.position.copyFromFloats(x0 + i * 2 + 1, y0 + j * 2 + 1, z1 + 1);
                    p1.rotationQuaternion = undefined;
                    p1.rotation.x = Math.PI * 0.5;
                }
            }
        }
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.depth; j++) {
                let t0 = new GalaxyTile(this);
                t0.position.copyFromFloats(x0 + i * 2, y0 - 1, z0 + j * 2);
                t0.rotation.x = -Math.PI;
                this.templateTile.clone("clone", t0);
                let t1 = new GalaxyTile(this);
                t1.position.copyFromFloats(x0 + i * 2, y1 + 1, z0 + j * 2);
                this.templateTile.clone("clone", t1);
                if (i < this.width - 1 && j < this.depth - 1) {
                    let p0 = this.templatePole.clone("clone", undefined);
                    p0.position.copyFromFloats(x0 + i * 2 + 1, y0 - 1, z0 + j * 2 + 1);
                    p0.rotationQuaternion = undefined;
                    p0.rotation.x = Math.PI;
                    let p1 = this.templatePole.clone("clone", undefined);
                    p1.position.copyFromFloats(x0 + i * 2 + 1, y1 + 1, z0 + j * 2 + 1);
                    p1.rotationQuaternion = undefined;
                }
            }
        }
        for (let i = 0; i < this.depth; i++) {
            for (let j = 0; j < this.height; j++) {
                let t0 = new GalaxyTile(this);
                t0.position.copyFromFloats(x0 - 1, y0 + j * 2, z0 + i * 2);
                t0.rotation.x = -Math.PI * 0.5;
                t0.rotation.y = Math.PI * 0.5;
                this.templateTile.clone("clone", t0);
                let t1 = new GalaxyTile(this);
                t1.position.copyFromFloats(x1 + 1, y0 + j * 2, z0 + i * 2);
                t1.rotation.x = -Math.PI * 0.5;
                t1.rotation.y = -Math.PI * 0.5;
                this.templateTile.clone("clone", t1);
                if (i < this.depth - 1 && j < this.height - 1) {
                    let p0 = this.templatePole.clone("clone", undefined);
                    p0.position.copyFromFloats(x0 - 1, y0 + j * 2 + 1, z0 + i * 2 + 1);
                    p0.rotationQuaternion = undefined;
                    p0.rotation.x = -Math.PI * 0.5;
                    p0.rotation.y = Math.PI * 0.5;
                    let p1 = this.templatePole.clone("clone", undefined);
                    p1.position.copyFromFloats(x1 + 1, y0 + j * 2 + 1, z0 + i * 2 + 1);
                    p1.rotationQuaternion = undefined;
                    p1.rotation.x = -Math.PI * 0.5;
                    p1.rotation.y = -Math.PI * 0.5;
                }
            }
        }
    }
}
/// <reference path="../../lib/babylon.d.ts"/>
/// <reference path="../../lib/babylon.gui.d.ts"/>
var COS30 = Math.cos(Math.PI / 6);
class Main {
    static get CameraPosition() {
        if (!Main._CameraPosition) {
            Main._CameraPosition = BABYLON.Vector2.Zero();
        }
        return Main._CameraPosition;
    }
    static set CameraPosition(p) {
        Main._CameraPosition = p;
    }
    static get redMaterial() {
        if (!Main._redMaterial) {
            Main._redMaterial = new BABYLON.StandardMaterial("red-material", Main.Scene);
            Main._redMaterial.diffuseColor.copyFromFloats(0.9, 0.1, 0.1);
        }
        return Main._redMaterial;
    }
    static get greenMaterial() {
        if (!Main._greenMaterial) {
            Main._greenMaterial = new BABYLON.StandardMaterial("green-material", Main.Scene);
            Main._greenMaterial.diffuseColor.copyFromFloats(0.1, 0.9, 0.1);
        }
        return Main._greenMaterial;
    }
    static get blueMaterial() {
        if (!Main._blueMaterial) {
            Main._blueMaterial = new BABYLON.StandardMaterial("blue-material", Main.Scene);
            Main._blueMaterial.diffuseColor.copyFromFloats(0.1, 0.1, 0.9);
        }
        return Main._blueMaterial;
    }
    static get whiteMaterial() {
        if (!Main._whiteMaterial) {
            Main._whiteMaterial = new BABYLON.StandardMaterial("white-material", Main.Scene);
            Main._whiteMaterial.diffuseColor.copyFromFloats(0.9, 0.9, 0.9);
        }
        return Main._whiteMaterial;
    }
    constructor(canvasElement) {
        Main.Canvas = document.getElementById(canvasElement);
        Main.Engine = new BABYLON.Engine(Main.Canvas, true, { preserveDrawingBuffer: true, stencil: true });
    }
    initializeCamera() {
        Main.Camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 10, BABYLON.Vector3.Zero(), Main.Scene);
        Main.Camera.setPosition(new BABYLON.Vector3(-2, 6, -10));
        Main.Camera.attachControl(Main.Canvas);
    }
    async initialize() {
        await this.initializeScene();
    }
    static async loadMeshes(modelName) {
        return new Promise(resolve => {
            BABYLON.SceneLoader.ImportMesh("", "./assets/models/" + modelName + ".glb", "", Main.Scene, (meshes) => {
                console.log("Load model : " + modelName);
                meshes.forEach((mesh) => {
                    console.log(mesh.name);
                });
                resolve(meshes[0]);
            });
        });
    }
    async initializeScene() {
        Main.Scene = new BABYLON.Scene(Main.Engine);
        this.initializeCamera();
        Main.Light = new BABYLON.HemisphericLight("AmbientLight", new BABYLON.Vector3(1, 3, 2), Main.Scene);
        let galaxy = new Galaxy();
        await galaxy.initialize();
        galaxy.instantiate();
    }
    animate() {
        Main.Engine.runRenderLoop(() => {
            Main.Scene.render();
        });
        window.addEventListener("resize", () => {
            Main.Engine.resize();
        });
    }
}
window.addEventListener("load", async () => {
    let main = new Main("render-canvas");
    await main.initialize();
    main.animate();
});
