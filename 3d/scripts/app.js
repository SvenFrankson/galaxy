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
class GalaxyItem extends BABYLON.Mesh {
    constructor(i, j, k, galaxy) {
        super("galaxy-item");
        this.i = i;
        this.j = j;
        this.k = k;
        this.galaxy = galaxy;
        this._ijk = new IJK(i, j, k);
        this.parent = galaxy;
        this.position.copyFromFloats(i, j, k);
        this.updateRotation();
    }
    get ijk() {
        return this._ijk;
    }
    static Create(i, j, k, galaxy) {
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
    updateRotation() {
        let up = BABYLON.Vector3.Zero();
        if (this.i === 0) {
            up.x = -1;
        }
        else if (this.i === this.galaxy.width) {
            up.x = 1;
        }
        if (this.j === 0) {
            up.y = -1;
        }
        else if (this.j === this.galaxy.height) {
            up.y = 1;
        }
        if (this.k === 0) {
            up.z = -1;
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
/// <reference path="GalaxyItem.ts"/>
class Border extends GalaxyItem {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.name = "border-" + i + "-" + j + "-" + k;
        let up = this.getDirection(BABYLON.Axis.Y);
        this.position.addInPlace(up.scale(0.25));
    }
    instantiate() {
        this.galaxy.templateLightning.clone("clone", this);
    }
    updateRotation() {
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
var ZoneStatus;
(function (ZoneStatus) {
    ZoneStatus[ZoneStatus["None"] = 0] = "None";
    ZoneStatus[ZoneStatus["Valid"] = 1] = "Valid";
    ZoneStatus[ZoneStatus["Invalid"] = 2] = "Invalid";
})(ZoneStatus || (ZoneStatus = {}));
class IJK {
    constructor(i, j, k) {
        this.i = i;
        this.j = j;
        this.k = k;
    }
    isEqual(other) {
        return this.i === other.i && this.j === other.j && this.k === other.k;
    }
    isTile() {
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
    forEachAround(callback) {
        callback(new IJK(this.i - 1, this.j, this.k));
        callback(new IJK(this.i, this.j - 1, this.k));
        callback(new IJK(this.i, this.j, this.k - 1));
        callback(new IJK(this.i + 1, this.j, this.k));
        callback(new IJK(this.i, this.j + 1, this.k));
        callback(new IJK(this.i, this.j, this.k + 1));
    }
}
class Galaxy extends BABYLON.TransformNode {
    constructor() {
        super("galaxy");
        this.width = 10;
        this.height = 6;
        this.depth = 8;
    }
    isIJKValid(ijk) {
        if (ijk.i === 0 || ijk.i === this.width || ijk.j === 0 || ijk.j === this.height || ijk.k === 0 || ijk.k === this.depth) {
            if (ijk.i >= 0 && ijk.i <= this.width && ijk.j >= 0 && ijk.j <= this.height && ijk.k >= 0 && ijk.k <= this.depth) {
                return true;
            }
        }
        return false;
    }
    async initialize() {
        this.templateTile = await Main.loadMeshes("tile-lp");
        this.templatePole = await Main.loadMeshes("pole");
        this.templatePoleEdge = await Main.loadMeshes("pole");
        this.templatePoleCorner = await Main.loadMeshes("pole");
        this.templateLightning = await Main.loadMeshes("lightning");
    }
    instantiate() {
        this.position.copyFromFloats(-this.width * 0.5, -this.height * 0.5, -this.depth * 0.5);
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
        Main.Scene.onPointerObservable.add((eventData) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this.onPointerDown();
            }
        });
    }
    updateZones() {
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
            let zoneStatus = this.isZoneValid(zone);
            zone.forEach(t => {
                t.setIsValid(zoneStatus);
            });
        }
        console.log(this.zones.length + " zones detected.");
    }
    areSymetrical(tileA, edgeA, tileB, edgeB, tilesToConsider) {
        let footPrintA = tileA.getFootPrint(edgeA);
        let footPrintB = tileB.getFootPrint(edgeB);
        if (footPrintA != footPrintB) {
            return false;
        }
        let footPrint = footPrintA;
        let output = true;
        for (let i = 0; i < 3; i++) {
            if (footPrint[i] === "1") {
                let tileANext = tileA.getNeighbour(edgeA, i + 1);
                let tileBNext = tileB.getNeighbour(edgeB, i + 1);
                if (!tileANext || !tileBNext) {
                    debugger;
                }
                let tileANextIndex = tilesToConsider.indexOf(tileANext);
                let tileBNextIndex = tilesToConsider.indexOf(tileBNext);
                if (tileANextIndex != -1 && tileBNextIndex != -1) {
                    tilesToConsider.splice(tileANextIndex, 1);
                    tilesToConsider.splice(tileBNextIndex, 1);
                    output = output && this.areSymetrical(tileANext, tileA.getNextEdge(edgeA, i + 1), tileBNext, tileB.getNextEdge(edgeB, i + 1), tilesToConsider);
                }
            }
        }
        return output;
    }
    isZoneValid(zone) {
        let orbTile;
        for (let i = 0; i < zone.length; i++) {
            let tile = zone[i];
            if (tile.hasOrb) {
                if (!orbTile) {
                    orbTile = tile;
                }
                else {
                    return ZoneStatus.None;
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
            let tilesToConsider = [...zone];
            let orbTileIndex = tilesToConsider.indexOf(orbTile);
            tilesToConsider.splice(orbTileIndex, 1);
            if (border0 && border2 || !border0 && !border2) {
                if (border1 && border3 || !border1 && !border3) {
                    let output = true;
                    if (!border0) {
                        let tileA = orbTile.neighbours[0];
                        let tileAIndex = tilesToConsider.indexOf(tileA);
                        tilesToConsider.splice(tileAIndex, 1);
                        let tileB = orbTile.neighbours[2];
                        let tileBIndex = tilesToConsider.indexOf(tileB);
                        tilesToConsider.splice(tileBIndex, 1);
                        output = output && this.areSymetrical(tileA, e0, tileB, e2, tilesToConsider);
                    }
                    if (output && !border1 && tilesToConsider.length > 0) {
                        let tileC = orbTile.neighbours[1];
                        let tileCIndex = tilesToConsider.indexOf(tileC);
                        tilesToConsider.splice(tileCIndex, 1);
                        let tileD = orbTile.neighbours[3];
                        let tileDIndex = tilesToConsider.indexOf(tileD);
                        tilesToConsider.splice(tileDIndex, 1);
                        output = this.areSymetrical(tileC, e1, tileD, e3, tilesToConsider);
                    }
                    if (output) {
                        return ZoneStatus.Valid;
                    }
                    else {
                        return ZoneStatus.Invalid;
                    }
                }
            }
            return ZoneStatus.Invalid;
        }
        return ZoneStatus.None;
    }
    addToZone(zone, tile, tiles) {
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
    getItem(a, j, k) {
        let i;
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
    setItem(ijk, item) {
        this.items[ijk.i][ijk.j][ijk.k] = item;
    }
    toggleBorder(ijk) {
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
    worldPositionToIJK(worldPosition) {
        let i = Math.round(worldPosition.x + this.width * 0.5);
        let j = Math.round(worldPosition.y + this.height * 0.5);
        let k = Math.round(worldPosition.z + this.depth * 0.5);
        return new IJK(i, j, k);
    }
    onPointerDown() {
        let pick = Main.Scene.pick(Main.Scene.pointerX, Main.Scene.pointerY);
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
            Main._redMaterial.emissiveColor.copyFromFloats(0.45, 0.05, 0.05);
        }
        return Main._redMaterial;
    }
    static get greenMaterial() {
        if (!Main._greenMaterial) {
            Main._greenMaterial = new BABYLON.StandardMaterial("green-material", Main.Scene);
            Main._greenMaterial.diffuseColor.copyFromFloats(0.1, 0.9, 0.1);
            Main._greenMaterial.emissiveColor.copyFromFloats(0.05, 0.45, 0.05);
        }
        return Main._greenMaterial;
    }
    static get blueMaterial() {
        if (!Main._blueMaterial) {
            Main._blueMaterial = new BABYLON.StandardMaterial("blue-material", Main.Scene);
            Main._blueMaterial.diffuseColor.copyFromFloats(0.1, 0.1, 0.9);
            Main._blueMaterial.emissiveColor.copyFromFloats(0.05, 0.05, 0.45);
        }
        return Main._blueMaterial;
    }
    static get whiteMaterial() {
        if (!Main._whiteMaterial) {
            Main._whiteMaterial = new BABYLON.StandardMaterial("white-material", Main.Scene);
            Main._whiteMaterial.diffuseColor.copyFromFloats(0.9, 0.9, 0.9);
            Main._whiteMaterial.emissiveColor.copyFromFloats(0.45, 0.45, 0.45);
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
        Main.Camera.wheelPrecision *= 10;
    }
    async initialize() {
        await this.initializeScene();
    }
    static async loadMeshes(modelName) {
        return new Promise(resolve => {
            BABYLON.SceneLoader.ImportMesh("", "./assets/models/" + modelName + ".glb", "", Main.Scene, (meshes) => {
                console.log("Load model : " + modelName);
                meshes.forEach((mesh) => {
                    let material = mesh.material;
                    if (material instanceof BABYLON.PBRMaterial) {
                        console.log("PBRMaterial " + material.name + " loaded.");
                        if (material.name === "grid") {
                            material.transparencyMode = undefined;
                            material.albedoTexture.hasAlpha = true;
                        }
                    }
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
class Plot extends GalaxyItem {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.name = "plot-" + i + "-" + j + "-" + k;
    }
    instantiate() {
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
/// <reference path="GalaxyItem.ts"/>
class Tile extends GalaxyItem {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.edges = [];
        this.neighbours = [];
        this._isValid = ZoneStatus.None;
        this.hasOrb = false;
        this.name = "tile-" + i + "-" + j + "-" + k;
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
            ];
        }
    }
    get isValid() {
        return this._isValid;
    }
    updateNeighbours() {
        this.neighbours = [];
        for (let i = 0; i < this.edges.length; i++) {
            let e = this.edges[i];
            e.forEachAround(ijk => {
                if (this.galaxy.isIJKValid(ijk)) {
                    if (ijk.isTile()) {
                        if (!ijk.isEqual(this.ijk)) {
                            this.neighbours.push(this.galaxy.getItem(ijk));
                        }
                    }
                }
            });
        }
    }
    instantiate() {
        this.galaxy.templateTile.clone("clone", this);
        if (this.hasOrb) {
            this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
            this.orbMesh.parent = this;
            this.orbMesh.position.y = 0.5;
            this.orbMesh.material = Main.blueMaterial;
        }
    }
    setIsValid(v) {
        if (v != this.isValid) {
            if (this.isValidMesh) {
                this.isValidMesh.dispose();
                this.isValidMesh = undefined;
            }
            this._isValid = v;
            if (this.isValid != ZoneStatus.None) {
                this.isValidMesh = BABYLON.MeshBuilder.CreatePlane("", { size: 1.8 }, Main.Scene);
                this.isValidMesh.parent = this;
                this.isValidMesh.position.y = 0.05;
                this.isValidMesh.rotation.x = Math.PI * 0.5;
                if (this.isValid === ZoneStatus.Valid) {
                    this.isValidMesh.material = Main.greenMaterial;
                }
                else if (this.isValid === ZoneStatus.Invalid) {
                    this.isValidMesh.material = Main.redMaterial;
                }
            }
        }
    }
    getFootPrint(ijk) {
        let i0 = this.edges.findIndex(e => { return e.isEqual(ijk); });
        let footprint = "";
        for (let i = 1; i <= 3; i++) {
            footprint += this.galaxy.getItem(this.edges[(i0 + i) % 4]) ? "0" : "1";
        }
        return footprint;
    }
    getEdgeIndex(ijk) {
        for (let i = 0; i < this.edges.length; i++) {
            if (this.edges[i].isEqual(ijk)) {
                return i;
            }
        }
        return -1;
    }
    getNextEdge(ijk, offset = 1) {
        let index = this.getEdgeIndex(ijk);
        if (index != -1) {
            index = (index + offset) % 4;
            return this.edges[index];
        }
        return undefined;
    }
    getNeighbour(ijk, offset) {
        let index = this.getEdgeIndex(ijk);
        if (index != -1) {
            index = (index + offset) % 4;
            return this.neighbours[index];
        }
        return undefined;
    }
}
