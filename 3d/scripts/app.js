class BabylonPlus {
    static CreateInstanceDeep(target) {
        let instance;
        if (target.geometry) {
            instance = target.createInstance(target.name + "-instance");
        }
        else {
            instance = new BABYLON.Mesh(target.name + "-instance");
        }
        let children = target.getChildMeshes();
        for (let i = 0; i < children.length; i++) {
            let child = children[i];
            if (child instanceof BABYLON.Mesh) {
                let childInstance = child.createInstance(child.name + "-instance");
                childInstance.parent = instance;
            }
        }
        return instance;
    }
}
class GalaxyItem extends BABYLON.TransformNode {
    constructor(i, j, k, galaxy) {
        super("galaxy-item");
        this.i = i;
        this.j = j;
        this.k = k;
        this.galaxy = galaxy;
        this._ijk = new IJK(i, j, k);
        this.parent = galaxy;
        this.position.copyFromFloats(i - 0.5 * this.galaxy.width, j - 0.5 * this.galaxy.height, k - 0.5 * this.galaxy.depth);
        this.updateRotation();
        this.deepFreezeWorldMatrix();
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
            else if (odds === 2) {
                return new Tile(i, j, k, galaxy);
            }
        }
        return undefined;
    }
    deepFreezeWorldMatrix(target) {
        if (!target) {
            target = this;
        }
        target.freezeWorldMatrix();
        target.getChildren().forEach(c => {
            if (c instanceof BABYLON.AbstractMesh || c instanceof BABYLON.TransformNode) {
                this.deepFreezeWorldMatrix(c);
            }
        });
    }
    updateRotation() {
        if (!this.rotationQuaternion) {
            this.rotationQuaternion = BABYLON.Quaternion.Identity();
        }
        GalaxyItem.UpdateRotationToRef(this.ijk, this.galaxy, this.rotationQuaternion);
    }
    static UpdateRotationToRef(ijk, galaxy, quaternionRef) {
        let up = BABYLON.Vector3.Zero();
        let faceCount = 0;
        if (ijk.i === 0) {
            up.x = -1;
            faceCount++;
        }
        else if (ijk.i === galaxy.width) {
            up.x = 1;
            faceCount++;
        }
        if (ijk.j === 0) {
            up.y = -1;
            faceCount++;
        }
        else if (ijk.j === galaxy.height) {
            up.y = 1;
            faceCount++;
        }
        if (ijk.k === 0) {
            up.z = -1;
            faceCount++;
        }
        else if (ijk.k === galaxy.depth) {
            up.z = 1;
            faceCount++;
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
        if (faceCount === 3 && ijk.j === 0) {
            quaternionRef.multiplyToRef(BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.PI), quaternionRef);
        }
    }
}
/// <reference path="GalaxyItem.ts"/>
var DEBUG_SHOW_LOGICAL_EDGEBLOCK = false;
class Border extends GalaxyItem {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.name = "border-" + i + "-" + j + "-" + k;
        let up = this.getDirection(BABYLON.Axis.Y);
        this.position.addInPlace(up.scale(0.25));
        let stretch = false;
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
    updateRotation() {
        super.updateRotation();
        Border.UpdateRotationToRef(this.ijk, this.galaxy, this.rotationQuaternion);
    }
    static UpdateRotationToRef(ijk, galaxy, quaternionRef) {
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
    instantiate() {
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
    constructor() {
        super(...arguments);
        this._speed = 2;
        this._update = () => {
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
                this.smorb.position.z = -4;
            }
            this.freezeWorldMatrix();
        };
    }
    instantiate() {
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        this.galaxy.templateLightning.createInstance("clone").parent = this;
        if (this.smorb) {
            this.smorb.dispose();
        }
        this.smorb = BABYLON.MeshBuilder.CreateIcoSphere("smorb", { radius: 0.04, subdivisions: 1 }, Main.Scene);
        this.smorb.position.z = -2 + 4 * Math.random();
        this.smorb.parent = this;
        this.smorb.material = this.galaxy.templateLightning.material;
        this._speed = 1.5 + Math.random();
        this.freezeWorldMatrix();
        Main.Scene.onBeforeRenderObservable.add(this._update);
    }
    dispose(doNotRecurse, disposeMaterialAndTextures) {
        super.dispose(doNotRecurse, disposeMaterialAndTextures);
        Main.Scene.onBeforeRenderObservable.removeCallback(this._update);
    }
}
class EdgeBlock extends Border {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.isGeneratedByTile = false;
    }
    instantiate() { }
}
var ZoneStatus;
(function (ZoneStatus) {
    ZoneStatus[ZoneStatus["None"] = 0] = "None";
    ZoneStatus[ZoneStatus["Valid"] = 1] = "Valid";
    ZoneStatus[ZoneStatus["Invalid"] = 2] = "Invalid";
})(ZoneStatus || (ZoneStatus = {}));
var GalaxyEditionActionType;
(function (GalaxyEditionActionType) {
    GalaxyEditionActionType[GalaxyEditionActionType["Play"] = 0] = "Play";
    GalaxyEditionActionType[GalaxyEditionActionType["Orb"] = 1] = "Orb";
    GalaxyEditionActionType[GalaxyEditionActionType["Block"] = 2] = "Block";
})(GalaxyEditionActionType || (GalaxyEditionActionType = {}));
class Galaxy extends BABYLON.TransformNode {
    constructor() {
        super("galaxy");
        this.currentLevelIndex = -1;
        this.width = 10;
        this.height = 6;
        this.depth = 8;
        this.editionMode = false;
        this.galaxyEditionActionType = GalaxyEditionActionType.Play;
        this._pointerDownX = NaN;
        this._pointerDownY = NaN;
        this.pointerObservable = (eventData) => {
            if (eventData.type === BABYLON.PointerEventTypes.POINTERDOWN) {
                this._pointerDownX = eventData.event.clientX;
                this._pointerDownY = eventData.event.clientY;
            }
            if (eventData.type === BABYLON.PointerEventTypes.POINTERUP) {
                let delta = Math.abs(this._pointerDownX - eventData.event.clientX) + Math.abs(this._pointerDownY - eventData.event.clientY);
                if (delta < 10) {
                    this.onPointerUp();
                }
            }
        };
        this.updateObservable = () => {
            let pick = Main.Scene.pick(Main.Scene.pointerX, Main.Scene.pointerY);
            let showPreviewmesh = false;
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
                    let edge = this.getItem(ijk);
                    showPreviewmesh = true;
                    if (!this.previewMesh) {
                        this.previewMesh = BABYLON.MeshBuilder.CreateBox("preview-mesh", {
                            width: 0.15,
                            height: 0.15,
                            depth: 1.8
                        });
                        this.previewMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
                    }
                    if (edge instanceof Lightning) {
                        this.previewMesh.material = Main.previewRedMaterial;
                    }
                    else if (!edge) {
                        this.previewMesh.material = Main.previewBlueMaterial;
                    }
                    else {
                        showPreviewmesh = false;
                    }
                    if (showPreviewmesh) {
                        this.previewMesh.getChildMeshes().forEach(m => {
                            m.material = this.previewMesh.material;
                        });
                        this.previewMesh.position.copyFromFloats(ijk.i - 0.5 * this.width, ijk.j - 0.5 * this.height, ijk.k - 0.5 * this.depth);
                        GalaxyItem.UpdateRotationToRef(ijk, this, this.previewMesh.rotationQuaternion);
                        Border.UpdateRotationToRef(ijk, this, this.previewMesh.rotationQuaternion);
                        this.previewMesh.position.addInPlace(this.previewMesh.getDirection(BABYLON.Axis.Y).scale(0.25));
                        this.previewMesh.isVisible = true;
                        this.previewMesh.getChildMeshes().forEach(m => {
                            m.isVisible = true;
                        });
                    }
                }
            }
            if (!showPreviewmesh) {
                if (this.previewMesh) {
                    this.previewMesh.isVisible = false;
                    this.previewMesh.getChildMeshes().forEach(m => {
                        m.isVisible = false;
                    });
                }
            }
        };
        console.log("Create new Galaxy.");
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
        let templateTileRaw = await Main.loadMeshes("tile");
        this.templateTile = templateTileRaw;
        let templateTileBlockRaw = await Main.loadMeshes("tile-block");
        this.templateTileBlock = templateTileBlockRaw;
        this.templateTileGrid = templateTileRaw.getChildMeshes()[2].clone("template-tile-grid");
        this.templateTileGridValid = this.templateTileGrid.clone("template-tile-grid-valid");
        this.templateTileGridValid.material = this.templateTileGridValid.material.clone("template-tile-valid-material");
        if (this.templateTileGridValid.material instanceof BABYLON.PBRMaterial) {
            this.templateTileGridValid.material.emissiveColor.copyFromFloats(0.05, 0.45, 0.05);
        }
        this.templateTileGridInvalid = this.templateTileGrid.clone("template-tile-grid-invalid");
        this.templateTileGridInvalid.material = this.templateTileGridInvalid.material.clone("template-tile-invalid-material");
        if (this.templateTileGridInvalid.material instanceof BABYLON.PBRMaterial) {
            this.templateTileGridInvalid.material.emissiveColor.copyFromFloats(0.45, 0.05, 0.05);
        }
        let templatePoleRaw = await Main.loadMeshes("pole");
        this.templatePole = MeshUtils.MergeTemplateIntoOneMeshTemplate(templatePoleRaw);
        let templatePoleEdgeRaw = await Main.loadMeshes("pole");
        this.templatePoleEdge = MeshUtils.MergeTemplateIntoOneMeshTemplate(templatePoleEdgeRaw);
        let templatePoleCornerRaw = await Main.loadMeshes("tripole");
        this.templatePoleCorner = MeshUtils.MergeTemplateIntoOneMeshTemplate(templatePoleCornerRaw);
        let templateLightningRaw = await Main.loadMeshes("lightning");
        this.templateLightning = MeshUtils.MergeTemplateIntoOneMeshTemplate(templateLightningRaw);
        let templateEdgeBlockRaw = await Main.loadMeshes("edge-block");
        this.templateEdgeBlock = MeshUtils.MergeTemplateIntoOneMeshTemplate(templateEdgeBlockRaw);
    }
    async loadLevel(levelIndex) {
        return new Promise(resolve => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', "assets/levels/level-" + levelIndex + ".json");
            xhr.onload = () => {
                this.currentLevelIndex = levelIndex;
                let data = JSON.parse(xhr.responseText);
                this.doLoadLevel(data);
                resolve();
            };
            xhr.send();
        });
    }
    doLoadLevel(data) {
        this.width = data.width;
        this.height = data.height;
        this.depth = data.depth;
        this.instantiate();
        for (let i = 0; i < data.orbTiles.length; i++) {
            let orbTile = data.orbTiles[i];
            let tile = this.getItem(orbTile.i, orbTile.j, orbTile.k);
            if (tile && tile instanceof Tile) {
                tile.setHasOrb(true);
                tile.refresh();
                console.log("Orb added.");
            }
        }
        if (data.tileBlocks) {
            for (let i = 0; i < data.tileBlocks.length; i++) {
                let tileBlock = data.tileBlocks[i];
                let tile = this.getItem(tileBlock.i, tileBlock.j, tileBlock.k);
                if (tile && tile instanceof Tile) {
                    tile.isBlock = true;
                    tile.refresh();
                }
            }
        }
        if (data.edgeBlocks) {
            for (let i = 0; i < data.edgeBlocks.length; i++) {
                let edgeBlockData = data.edgeBlocks[i];
                let edge = this.getItem(edgeBlockData.i, edgeBlockData.j, edgeBlockData.k);
                if (!edge) {
                    this.addEdgeBlock(IJK.IJK(edgeBlockData));
                }
            }
        }
        if (data.edgeOrbs) {
            for (let i = 0; i < data.edgeOrbs.length; i++) {
                let edgeOrbData = data.edgeOrbs[i];
                let edge = this.getItem(edgeOrbData.i, edgeOrbData.j, edgeOrbData.k);
                if (!edge) {
                    this.addEdgeOrb(IJK.IJK(edgeOrbData));
                }
            }
        }
        this.solution = [];
        if (data.lightnings) {
            for (let i = 0; i < data.lightnings.length; i++) {
                this.solution.push(IJK.IJK(data.lightnings[i]));
            }
        }
        this.updateZones();
        this.rebuildTileContainer();
    }
    clear() {
        console.log("Clear Galaxy.");
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        this.items = [];
        this.tiles = [];
        this.poles = [];
        this.edgeOrbs = [];
        this.edgeBlocks = [];
    }
    instantiate() {
        console.log("Instantiate Galaxy.");
        this.rotation.y = 0;
        this.clear();
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
                        }
                        if (item instanceof Plot) {
                            this.poles.push(item);
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
        this.rebuildTileContainer();
        this.registerToUI();
        this.updateZones();
    }
    rebuildTileContainer() {
        if (this.tilesContainer) {
            this.tilesContainer.dispose();
        }
        this.tilesContainer = GalaxyBuilder.GenerateGalaxyBase(this);
        this.tilesContainer.parent = this;
    }
    registerToUI() {
        Main.Scene.onPointerObservable.removeCallback(this.pointerObservable);
        Main.Scene.onPointerObservable.add(this.pointerObservable);
        Main.Scene.onBeforeRenderObservable.removeCallback(this.updateObservable);
        Main.Scene.onBeforeRenderObservable.add(this.updateObservable);
        if (this.editionMode) {
            document.getElementById("editor-part").style.display = "block";
            document.getElementById("level-part").style.display = "none";
            document.getElementById("width-value").textContent = this.width.toFixed(0);
            document.getElementById("btn-width-dec").onclick = () => {
                this.width = Math.max(2, this.width - 2);
                this.instantiate();
            };
            document.getElementById("btn-width-inc").onclick = () => {
                this.width = this.width + 2;
                this.instantiate();
            };
            document.getElementById("height-value").textContent = this.height.toFixed(0);
            document.getElementById("btn-height-dec").onclick = () => {
                this.height = Math.max(2, this.height - 2);
                this.instantiate();
            };
            document.getElementById("btn-height-inc").onclick = () => {
                this.height = this.height + 2;
                this.instantiate();
            };
            document.getElementById("depth-value").textContent = this.depth.toFixed(0);
            document.getElementById("btn-depth-dec").onclick = () => {
                this.depth = Math.max(2, this.depth - 2);
                this.instantiate();
            };
            document.getElementById("btn-depth-inc").onclick = () => {
                this.depth = this.depth + 2;
                this.instantiate();
            };
            document.getElementById("btn-download").onclick = () => {
                let data = this.serialize();
                var tmpLink = document.createElement('a');
                let name = "galaxy-editor";
                tmpLink.download = name + ".json";
                tmpLink.href = 'data:json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));
                document.body.appendChild(tmpLink);
                tmpLink.click();
                document.body.removeChild(tmpLink);
            };
            document.getElementById("lightning-add").onclick = () => {
                this.galaxyEditionActionType = GalaxyEditionActionType.Play;
                document.getElementById("lightning-add").classList.add("active");
                document.getElementById("orb-add").classList.remove("active");
                document.getElementById("block-add").classList.remove("active");
            };
            document.getElementById("orb-add").onclick = () => {
                this.galaxyEditionActionType = GalaxyEditionActionType.Orb;
                document.getElementById("lightning-add").classList.remove("active");
                document.getElementById("orb-add").classList.add("active");
                document.getElementById("block-add").classList.remove("active");
            };
            document.getElementById("block-add").onclick = () => {
                this.galaxyEditionActionType = GalaxyEditionActionType.Block;
                document.getElementById("lightning-add").classList.remove("active");
                document.getElementById("orb-add").classList.remove("active");
                document.getElementById("block-add").classList.add("active");
            };
            /*document.body.onkeyup = () => {
                this.galaxyEditionActionType = (this.galaxyEditionActionType + 1) % 3;
                if (this.galaxyEditionActionType === GalaxyEditionActionType.Play) {
                    document.getElementById("lightning-add").classList.add("active");
                    document.getElementById("orb-add").classList.remove("active");
                    document.getElementById("block-add").classList.remove("active");
                }
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Orb) {
                    document.getElementById("lightning-add").classList.remove("active");
                    document.getElementById("orb-add").classList.add("active");
                    document.getElementById("block-add").classList.remove("active");
                }
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Block) {
                    document.getElementById("lightning-add").classList.remove("active");
                    document.getElementById("orb-add").classList.remove("active");
                    document.getElementById("block-add").classList.add("active");
                }
            };*/
        }
        else {
            document.getElementById("editor-part").style.display = "none";
            document.getElementById("level-part").style.display = "block";
        }
    }
    updateZones() {
        this.zones = [];
        let tiles = [];
        for (let i = 0; i < this.tiles.length; i++) {
            if (!this.tiles[i].isBlock) {
                tiles.push(this.tiles[i]);
            }
        }
        while (tiles.length > 0) {
            let tile = tiles.pop();
            let zone = [];
            this.addToZone(zone, tile, tiles);
            this.zones.push(zone);
        }
        console.log("UpdateZones : " + this.zones.length + " zones found.");
        let solved = true;
        for (let i = 0; i < this.zones.length; i++) {
            let zone = this.zones[i];
            let zoneStatus = this.isZoneValid(zone);
            if (zoneStatus != ZoneStatus.Valid) {
                solved = false;
            }
            zone.forEach(t => {
                t.setIsValid(zoneStatus);
            });
        }
        if (this.tilesGridContainer) {
            this.tilesGridContainer.dispose();
        }
        this.tilesGridContainer = GalaxyBuilder.GenerateTileGrids(this);
        this.tilesGridContainer.parent = this;
        if (solved) {
            document.getElementById("solve-status").textContent = "SOLVED";
            document.getElementById("solve-status").style.color = "green";
            if (!Main.Galaxy.editionMode) {
                document.getElementById("ui").style.display = "none";
                document.getElementById("main-ui").style.display = "block";
                document.getElementById("levels-choice").classList.remove("show");
                document.getElementById("settings").classList.remove("show");
                document.getElementById("credits").classList.remove("show");
                document.getElementById("main-panel").classList.remove("show");
                document.getElementById("victory").classList.add("show");
                document.getElementById("level-win").textContent = this.currentLevelIndex.toString();
                LevelStatus.instance.setLevelStatus(this.currentLevelIndex, true);
            }
        }
        else {
            document.getElementById("solve-status").textContent = "NOT SOLVED";
            document.getElementById("solve-status").style.color = "red";
        }
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
        let orbEdge;
        let orbTiles;
        if (!orbTile) {
            for (let i = 0; i < zone.length; i++) {
                let tile = zone[i];
                let ijk = tile.getEdgeOrb();
                if (ijk) {
                    if (!orbEdge) {
                        orbEdge = ijk;
                        orbTiles = [tile, tile.getEdgeOrbNeighbour()];
                    }
                    else if (!orbEdge.isEqual(ijk)) {
                        return ZoneStatus.None;
                    }
                }
            }
        }
        if (orbTile || orbEdge) {
            let e0;
            let e1;
            let e2;
            let e3;
            let e4;
            let e5;
            let border0;
            let border1;
            let border2;
            let border3;
            let border4;
            let border5;
            let tilesToConsider = [...zone];
            if (orbTile) {
                e0 = orbTile.edges[0];
                border0 = this.getItem(e0);
                e2 = orbTile.edges[2];
                border2 = this.getItem(e2);
                e1 = orbTile.edges[1];
                border1 = this.getItem(e1);
                e3 = orbTile.edges[3];
                border3 = this.getItem(e3);
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
            else {
                let t0Index = orbTiles[0].getEdgeIndex(orbEdge);
                let t1Index = orbTiles[1].getEdgeIndex(orbEdge);
                e0 = orbTiles[0].edges[(t0Index + 1) % 4];
                border0 = this.getItem(e0);
                e3 = orbTiles[1].edges[(t1Index + 1) % 4];
                border3 = this.getItem(e3);
                e1 = orbTiles[0].edges[(t0Index + 2) % 4];
                border1 = this.getItem(e1);
                e4 = orbTiles[1].edges[(t1Index + 2) % 4];
                border4 = this.getItem(e4);
                e2 = orbTiles[0].edges[(t0Index + 3) % 4];
                border2 = this.getItem(e2);
                e5 = orbTiles[1].edges[(t1Index + 3) % 4];
                border5 = this.getItem(e5);
                let orbTiles0Index = tilesToConsider.indexOf(orbTiles[0]);
                tilesToConsider.splice(orbTiles0Index, 1);
                let orbTiles1Index = tilesToConsider.indexOf(orbTiles[1]);
                tilesToConsider.splice(orbTiles1Index, 1);
                if (border0 && border3 || !border0 && !border3) {
                    if (border1 && border4 || !border1 && !border4) {
                        if (border2 && border5 || !border2 && !border5) {
                            let output = true;
                            if (!border0) {
                                let tileA = orbTiles[0].neighbours[(t0Index + 1) % 4];
                                let tileAIndex = tilesToConsider.indexOf(tileA);
                                tilesToConsider.splice(tileAIndex, 1);
                                let tileB = orbTiles[1].neighbours[(t1Index + 1) % 4];
                                let tileBIndex = tilesToConsider.indexOf(tileB);
                                tilesToConsider.splice(tileBIndex, 1);
                                output = output && this.areSymetrical(tileA, e0, tileB, e3, tilesToConsider);
                            }
                            if (output && !border1 && tilesToConsider.length > 0) {
                                let tileC = orbTiles[0].neighbours[(t0Index + 2) % 4];
                                let tileCIndex = tilesToConsider.indexOf(tileC);
                                tilesToConsider.splice(tileCIndex, 1);
                                let tileD = orbTiles[1].neighbours[(t1Index + 2) % 4];
                                let tileDIndex = tilesToConsider.indexOf(tileD);
                                tilesToConsider.splice(tileDIndex, 1);
                                output = this.areSymetrical(tileC, e1, tileD, e4, tilesToConsider);
                            }
                            if (output && !border2 && tilesToConsider.length > 0) {
                                let tileC = orbTiles[0].neighbours[(t0Index + 3) % 4];
                                let tileCIndex = tilesToConsider.indexOf(tileC);
                                tilesToConsider.splice(tileCIndex, 1);
                                let tileD = orbTiles[1].neighbours[(t1Index + 3) % 4];
                                let tileDIndex = tilesToConsider.indexOf(tileD);
                                tilesToConsider.splice(tileDIndex, 1);
                                output = this.areSymetrical(tileC, e2, tileD, e5, tilesToConsider);
                            }
                            if (output) {
                                return ZoneStatus.Valid;
                            }
                            else {
                                return ZoneStatus.Invalid;
                            }
                        }
                    }
                }
                return ZoneStatus.Invalid;
            }
        }
        return ZoneStatus.Invalid;
    }
    addToZone(zone, tile, tiles) {
        if (zone.indexOf(tile) === -1) {
            zone.push(tile);
        }
        for (let i = 0; i < tile.neighbours.length; i++) {
            let edge = tile.edges[i];
            let edgeItem = this.getItem(edge);
            if (!edgeItem || edgeItem instanceof EdgeOrb) {
                let other = tile.neighbours[i];
                let index = tiles.indexOf(other);
                if (index != -1) {
                    tiles.splice(index, 1);
                    this.addToZone(zone, other, tiles);
                }
            }
        }
    }
    removeAllLightnings() {
        for (let i = 0; i <= this.width; i++) {
            for (let j = 0; j <= this.height; j++) {
                for (let k = 0; k <= this.depth; k++) {
                    let item = this.getItem(i, j, k);
                    if (item instanceof Lightning) {
                        item.dispose();
                        this.setItem(undefined, i, j, k);
                    }
                }
            }
        }
        this.updateZones();
    }
    solve() {
        //this.removeAllLightnings();
        if (this.solution) {
            for (let i = 0; i < this.solution.length; i++) {
                this.toggleLightning(this.solution[i]);
                this.updateZones();
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
    setItem(item, a, j, k) {
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
                this.items[i][j][k] = item;
            }
        }
    }
    toggleLightning(ijk) {
        let item = this.getItem(ijk);
        if (item instanceof EdgeBlock) {
            return;
        }
        if (item instanceof EdgeOrb) {
            return;
        }
        if (item instanceof Lightning) {
            console.log("Remove Lightning");
            item.dispose();
            this.setItem(undefined, ijk);
        }
        else {
            console.log("Add Lightning");
            let border = new Lightning(ijk.i, ijk.j, ijk.k, this);
            border.instantiate();
            this.setItem(border, ijk);
        }
    }
    addEdgeOrb(ijk) {
        let edgeOrb = new EdgeOrb(ijk.i, ijk.j, ijk.k, this);
        this.setItem(edgeOrb, ijk);
        edgeOrb.instantiate();
        this.edgeOrbs.push(edgeOrb);
        return edgeOrb;
    }
    removeEdgeOrb(ijk) {
        let item = this.getItem(ijk);
        if (item instanceof EdgeOrb) {
            let index = this.edgeOrbs.indexOf(item);
            if (index != -1) {
                this.edgeOrbs.splice(index, 1);
            }
            item.dispose();
            this.setItem(undefined, ijk);
        }
    }
    addEdgeBlock(ijk) {
        let edgeBlock = new EdgeBlock(ijk.i, ijk.j, ijk.k, this);
        this.setItem(edgeBlock, ijk);
        edgeBlock.instantiate();
        this.edgeBlocks.push(edgeBlock);
        return edgeBlock;
    }
    removeEdgeBlock(ijk) {
        let item = this.getItem(ijk);
        if (item instanceof EdgeBlock) {
            let index = this.edgeBlocks.indexOf(item);
            if (index != -1) {
                this.edgeBlocks.splice(index, 1);
            }
            item.dispose();
            this.setItem(undefined, ijk);
        }
    }
    worldPositionToIJK(worldPosition) {
        let i = Math.round(worldPosition.x + this.width * 0.5);
        let j = Math.round(worldPosition.y + this.height * 0.5);
        let k = Math.round(worldPosition.z + this.depth * 0.5);
        i = Math.min(Math.max(i, 0), this.width);
        j = Math.min(Math.max(j, 0), this.height);
        k = Math.min(Math.max(k, 0), this.depth);
        return new IJK(i, j, k);
    }
    onPointerUp() {
        let pick = Main.Scene.pick(Main.Scene.pointerX, Main.Scene.pointerY);
        if (pick && pick.hit) {
            if (pick.pickedMesh && pick.pickedMesh.name === "left-camera-input") {
                Main.Camera.moveTo(-Math.PI / 2 + Main.Camera.getClosestAlpha(), Main.Camera.beta, Main.Camera.radius, 0.5);
            }
            else if (pick.pickedMesh && pick.pickedMesh.name === "right-camera-input") {
                Main.Camera.moveTo(Math.PI / 2 + Main.Camera.getClosestAlpha(), Main.Camera.beta, Main.Camera.radius, 0.5);
            }
            else if (pick.pickedMesh && pick.pickedMesh.name === "down-camera-input") {
                Main.Camera.moveTo(Main.Camera.alpha, Math.PI - Math.PI / 3, Main.Camera.radius, 0.5);
            }
            else if (pick.pickedMesh && pick.pickedMesh.name === "up-camera-input") {
                Main.Camera.moveTo(Main.Camera.alpha, Math.PI / 3, Main.Camera.radius, 0.5);
            }
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
                if (!this.editionMode || this.galaxyEditionActionType === GalaxyEditionActionType.Play) {
                    this.toggleLightning(ijk);
                    this.updateZones();
                }
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Block) {
                    let item = this.getItem(ijk);
                    if (item instanceof EdgeBlock) {
                        if (!item.isGeneratedByTile) {
                            this.removeEdgeBlock(ijk);
                            this.rebuildTileContainer();
                        }
                    }
                    else {
                        if (item instanceof Lightning) {
                            item.dispose();
                            this.setItem(undefined, ijk);
                        }
                        this.addEdgeBlock(ijk);
                        this.rebuildTileContainer();
                    }
                }
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Orb) {
                    let item = this.getItem(ijk);
                    let doAddEdgeOrb = true;
                    if (item instanceof EdgeBlock) {
                        if (!item.isGeneratedByTile) {
                            this.removeEdgeBlock(ijk);
                            this.rebuildTileContainer();
                        }
                        else {
                            doAddEdgeOrb = false;
                        }
                    }
                    else if (item instanceof Lightning) {
                        this.toggleLightning(ijk);
                    }
                    else if (item instanceof EdgeOrb) {
                        this.removeEdgeOrb(ijk);
                        doAddEdgeOrb = false;
                        this.updateZones();
                    }
                    if (doAddEdgeOrb) {
                        this.addEdgeOrb(ijk);
                        this.updateZones();
                    }
                }
            }
            if (odds === 2 && this.editionMode) {
                let item = this.getItem(ijk);
                if (this.galaxyEditionActionType === GalaxyEditionActionType.Orb) {
                    if (item instanceof Tile) {
                        item.setHasOrb(!item.hasOrb);
                        item.refresh();
                        this.updateZones();
                    }
                }
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Block) {
                    if (item instanceof Tile) {
                        item.isBlock = !item.isBlock;
                        item.refresh();
                        this.rebuildTileContainer();
                        this.updateZones();
                    }
                }
            }
        }
    }
    serialize() {
        let data = {};
        data.width = this.width;
        data.height = this.height;
        data.depth = this.depth;
        data.orbTiles = [];
        data.edgeOrbs = [];
        data.tileBlocks = [];
        data.edgeBlocks = [];
        data.lightnings = [];
        this.tiles.forEach(t => {
            if (t.hasOrb) {
                data.orbTiles.push({
                    i: t.i,
                    j: t.j,
                    k: t.k
                });
            }
            if (t.isBlock) {
                data.tileBlocks.push({
                    i: t.i,
                    j: t.j,
                    k: t.k
                });
            }
        });
        for (let i = 0; i <= this.width; i++) {
            for (let j = 0; j <= this.height; j++) {
                for (let k = 0; k <= this.depth; k++) {
                    let item = this.getItem(i, j, k);
                    if (item instanceof EdgeBlock && !item.isGeneratedByTile) {
                        data.edgeBlocks.push({
                            i: item.i,
                            j: item.j,
                            k: item.k
                        });
                    }
                    if (item instanceof Lightning) {
                        data.lightnings.push({
                            i: item.i,
                            j: item.j,
                            k: item.k
                        });
                    }
                    if (item instanceof EdgeOrb) {
                        data.edgeOrbs.push({
                            i: item.i,
                            j: item.j,
                            k: item.k
                        });
                    }
                }
            }
        }
        return data;
    }
}
class GalaxyBuilder {
    static GenerateGalaxyBase(galaxy) {
        let meshPartCount = 2 + 3 + 3 + 1;
        let datas = [];
        let positions = [];
        let indices = [];
        let normals = [];
        let uvs = [];
        for (let i = 0; i < meshPartCount; i++) {
            datas.push(new BABYLON.VertexData());
            positions.push([]);
            indices.push([]);
            normals.push([]);
            uvs.push([]);
        }
        let baseDatas = [];
        let baseMaterials = [];
        // Reference Tile meshes and materials.
        for (let i = 0; i < 2; i++) {
            let baseData = BABYLON.VertexData.ExtractFromMesh(galaxy.templateTile.getChildMeshes()[i]);
            baseDatas.push(baseData);
            baseMaterials.push(galaxy.templateTile.getChildMeshes()[i].material);
        }
        // Reference TileBlock meshes and materials.
        for (let i = 0; i < 3; i++) {
            let baseData = BABYLON.VertexData.ExtractFromMesh(galaxy.templateTileBlock.getChildMeshes()[i]);
            baseDatas.push(baseData);
            baseMaterials.push(galaxy.templateTileBlock.getChildMeshes()[i].material);
        }
        let baseDataPole = BABYLON.VertexData.ExtractFromMesh(galaxy.templatePole);
        baseDatas.push(baseDataPole);
        baseMaterials.push(galaxy.templatePole.material);
        let baseDataPoleEdge = BABYLON.VertexData.ExtractFromMesh(galaxy.templatePoleEdge);
        baseDatas.push(baseDataPoleEdge);
        baseMaterials.push(galaxy.templatePoleEdge.material);
        let baseDataPoleCorner = BABYLON.VertexData.ExtractFromMesh(galaxy.templatePoleCorner);
        baseDatas.push(baseDataPoleCorner);
        baseMaterials.push(galaxy.templatePoleCorner.material);
        let baseDataEdgeBlock = BABYLON.VertexData.ExtractFromMesh(galaxy.templateEdgeBlock);
        baseDatas.push(baseDataEdgeBlock);
        baseMaterials.push(galaxy.templateEdgeBlock.material);
        let p = BABYLON.Vector3.Zero();
        let n = BABYLON.Vector3.One();
        for (let i = 0; i < galaxy.tiles.length; i++) {
            let tile = galaxy.tiles[i];
            // J0 : Index of the first mesh & material that needs to be added.
            // JCount : Count of meshes that need to be added.
            let j0 = 0;
            let jCount = 2;
            if (tile.isBlock) {
                j0 = 2;
                jCount = 3;
            }
            for (let j = j0; j < j0 + jCount; j++) {
                let baseData = baseDatas[j];
                let l = positions[j].length / 3;
                for (let k = 0; k < baseData.positions.length / 3; k++) {
                    p.copyFromFloats(baseData.positions[3 * k], baseData.positions[3 * k + 1], -baseData.positions[3 * k + 2]);
                    p.rotateByQuaternionToRef(tile.rotationQuaternion, p);
                    p.addInPlace(tile.position);
                    positions[j].push(p.x, p.y, p.z);
                }
                for (let k = 0; k < baseData.indices.length / 3; k++) {
                    indices[j].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
                }
                for (let k = 0; k < baseData.normals.length / 3; k++) {
                    n.copyFromFloats(baseData.normals[3 * k], baseData.normals[3 * k + 1], -baseData.normals[3 * k + 2]);
                    n.rotateByQuaternionToRef(tile.rotationQuaternion, n);
                    normals[j].push(n.x, n.y, n.z);
                }
                for (let k = 0; k < baseData.uvs.length / 2; k++) {
                    uvs[j].push(baseData.uvs[2 * k], baseData.uvs[2 * k + 1]);
                }
            }
        }
        for (let i = 0; i < galaxy.poles.length; i++) {
            let pole = galaxy.poles[i];
            let baseIndex = pole.poleType + 5;
            let baseData = baseDatas[baseIndex];
            let l = positions[baseIndex].length / 3;
            for (let k = 0; k < baseData.positions.length / 3; k++) {
                p.copyFromFloats(baseData.positions[3 * k], baseData.positions[3 * k + 1], -baseData.positions[3 * k + 2]);
                p.rotateByQuaternionToRef(pole.rotationQuaternion, p);
                p.addInPlace(pole.position);
                positions[baseIndex].push(p.x, p.y, p.z);
            }
            for (let k = 0; k < baseData.indices.length / 3; k++) {
                indices[baseIndex].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
            }
            for (let k = 0; k < baseData.normals.length / 3; k++) {
                n.copyFromFloats(baseData.normals[3 * k], baseData.normals[3 * k + 1], -baseData.normals[3 * k + 2]);
                n.rotateByQuaternionToRef(pole.rotationQuaternion, n);
                normals[baseIndex].push(n.x, n.y, n.z);
            }
            for (let k = 0; k < baseData.uvs.length / 2; k++) {
                uvs[baseIndex].push(baseData.uvs[2 * k], baseData.uvs[2 * k + 1]);
            }
        }
        for (let i = 0; i < galaxy.edgeBlocks.length; i++) {
            let edgeBlock = galaxy.edgeBlocks[i];
            let baseIndex = 8;
            let baseData = baseDatas[baseIndex];
            let l = positions[baseIndex].length / 3;
            for (let k = 0; k < baseData.positions.length / 3; k++) {
                p.copyFromFloats(baseData.positions[3 * k] * edgeBlock.scaling.x, baseData.positions[3 * k + 1] * edgeBlock.scaling.y, -baseData.positions[3 * k + 2] * edgeBlock.scaling.z);
                p.rotateByQuaternionToRef(edgeBlock.rotationQuaternion, p);
                p.addInPlace(edgeBlock.position);
                positions[baseIndex].push(p.x, p.y, p.z);
            }
            for (let k = 0; k < baseData.indices.length / 3; k++) {
                indices[baseIndex].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
            }
            for (let k = 0; k < baseData.normals.length / 3; k++) {
                n.copyFromFloats(baseData.normals[3 * k], baseData.normals[3 * k + 1], -baseData.normals[3 * k + 2]);
                n.rotateByQuaternionToRef(edgeBlock.rotationQuaternion, n);
                normals[baseIndex].push(n.x, n.y, n.z);
            }
            for (let k = 0; k < baseData.uvs.length / 2; k++) {
                uvs[baseIndex].push(baseData.uvs[2 * k], baseData.uvs[2 * k + 1]);
            }
        }
        let container = new BABYLON.TransformNode("galaxy-base");
        for (let i = 0; i < meshPartCount; i++) {
            if (positions[i].length > 0) {
                let partMesh = new BABYLON.Mesh("part-" + i);
                datas[i].positions = positions[i];
                datas[i].indices = indices[i];
                datas[i].normals = normals[i];
                datas[i].uvs = uvs[i];
                datas[i].applyToMesh(partMesh);
                partMesh.parent = container;
                partMesh.material = baseMaterials[i];
            }
        }
        return container;
    }
    static GenerateTileGrids(galaxy) {
        let meshPartCount = 3;
        let datas = [];
        let positions = [];
        let indices = [];
        let normals = [];
        let uvs = [];
        for (let i = 0; i < meshPartCount; i++) {
            datas.push(new BABYLON.VertexData());
            positions.push([]);
            indices.push([]);
            normals.push([]);
            uvs.push([]);
        }
        let baseDatas = [];
        let baseMaterials = [];
        let tileGrid = BABYLON.VertexData.ExtractFromMesh(galaxy.templateTileGrid);
        baseDatas.push(tileGrid);
        baseMaterials.push(galaxy.templateTileGrid.material);
        let tileGridValid = BABYLON.VertexData.ExtractFromMesh(galaxy.templateTileGridValid);
        baseDatas.push(tileGridValid);
        baseMaterials.push(galaxy.templateTileGridValid.material);
        let tileGridInvalid = BABYLON.VertexData.ExtractFromMesh(galaxy.templateTileGridInvalid);
        baseDatas.push(tileGridInvalid);
        baseMaterials.push(galaxy.templateTileGridInvalid.material);
        let p = BABYLON.Vector3.Zero();
        let n = BABYLON.Vector3.One();
        for (let i = 0; i < galaxy.tiles.length; i++) {
            let tile = galaxy.tiles[i];
            if (!tile.isBlock) {
                let baseIndex = 0;
                if (tile.isValid === ZoneStatus.Valid) {
                    baseIndex = 1;
                }
                if (tile.isValid === ZoneStatus.Invalid) {
                    baseIndex = 2;
                }
                let baseData = baseDatas[baseIndex];
                let l = positions[baseIndex].length / 3;
                for (let k = 0; k < baseData.positions.length / 3; k++) {
                    p.copyFromFloats(baseData.positions[3 * k], baseData.positions[3 * k + 1], -baseData.positions[3 * k + 2]);
                    p.rotateByQuaternionToRef(tile.rotationQuaternion, p);
                    p.addInPlace(tile.position);
                    positions[baseIndex].push(p.x, p.y, p.z);
                }
                for (let k = 0; k < baseData.indices.length / 3; k++) {
                    indices[baseIndex].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
                }
                for (let k = 0; k < baseData.normals.length / 3; k++) {
                    n.copyFromFloats(baseData.normals[3 * k], baseData.normals[3 * k + 1], -baseData.normals[3 * k + 2]);
                    n.rotateByQuaternionToRef(tile.rotationQuaternion, n);
                    normals[baseIndex].push(n.x, n.y, n.z);
                }
                for (let k = 0; k < baseData.uvs.length / 2; k++) {
                    uvs[baseIndex].push(baseData.uvs[2 * k], baseData.uvs[2 * k + 1]);
                }
            }
        }
        let container = new BABYLON.TransformNode("galaxy-base");
        for (let i = 0; i < meshPartCount; i++) {
            if (positions[i].length > 0) {
                let partMesh = new BABYLON.Mesh("part-" + i);
                datas[i].positions = positions[i];
                datas[i].indices = indices[i];
                datas[i].normals = normals[i];
                datas[i].uvs = uvs[i];
                datas[i].applyToMesh(partMesh);
                partMesh.parent = container;
                partMesh.material = baseMaterials[i];
            }
        }
        return container;
    }
}
class GalaxyCamera extends BABYLON.ArcRotateCamera {
    constructor(galaxy) {
        super("camera", 0, 0, 10, BABYLON.Vector3.Zero(), Main.Scene);
        this.galaxy = galaxy;
        this.useFreeCamera = true;
        this.targetAlpha = Math.PI / 4;
        this.targetBeta = Math.PI / 3;
        this._alphaSpeed = 0;
        this._betaSpeed = 0;
        this.updateCamera = () => {
            /*
            let dt = Main.Engine.getDeltaTime() / 1000;
    
            this._alphaSpeed += Math.abs(VMath.AngularDistance(this.alpha, this.targetAlpha)) / (2 * Math.PI) * 0.2 * dt;
            this._betaSpeed += VMath.AngularDistance(this.beta, this.targetBeta) / (2 * Math.PI) * 0.2 * dt;
            this._alphaSpeed *= 0.99;
            this._betaSpeed *= 0.99;
    
            this.alpha = VMath.StepAngle(this.alpha, this.targetAlpha, this._alphaSpeed);
            this.beta = VMath.StepAngle(this.beta, this.targetBeta, this._betaSpeed);
            */
        };
        this._locked = false;
        this.setPosition(new BABYLON.Vector3(-2, 6, -10));
        this.attachControl(Main.Canvas);
        this.wheelPrecision *= 10;
    }
    get scene() {
        return this.getScene();
    }
    setFreeCamera(freeCamera) {
        if (this.useFreeCamera != freeCamera) {
            this.useFreeCamera = freeCamera;
            if (this.useFreeCamera) {
                Main.Scene.onBeforeRenderObservable.removeCallback(this.updateCamera);
                Main.Camera.attachControl(Main.Canvas);
                if (this.leftCameraInput) {
                    this.leftCameraInput.dispose();
                }
                if (this.rightCameraInput) {
                    this.rightCameraInput.dispose();
                }
                if (this.downCameraInput) {
                    this.downCameraInput.dispose();
                }
                if (this.upCameraInput) {
                    this.upCameraInput.dispose();
                }
            }
            else {
                Main.Scene.onBeforeRenderObservable.add(this.updateCamera);
                Main.Camera.detachControl(Main.Canvas);
                this.leftCameraInput = BABYLON.MeshBuilder.CreateBox("left-camera-input", { width: 1, height: 0.5, depth: 0.1 });
                this.leftCameraInput.parent = Main.Camera;
                this.leftCameraInput.position.copyFromFloats(-3, -3, 10);
                this.rightCameraInput = BABYLON.MeshBuilder.CreateBox("right-camera-input", { width: 1, height: 0.5, depth: 0.1 });
                this.rightCameraInput.parent = Main.Camera;
                this.rightCameraInput.position.copyFromFloats(3, -3, 10);
                this.downCameraInput = BABYLON.MeshBuilder.CreateBox("down-camera-input", { width: 0.5, height: 1, depth: 0.1 });
                this.downCameraInput.parent = Main.Camera;
                this.downCameraInput.position.copyFromFloats(4, -2, 10);
                this.upCameraInput = BABYLON.MeshBuilder.CreateBox("up-camera-input", { width: 0.5, height: 1, depth: 0.1 });
                this.upCameraInput.parent = Main.Camera;
                this.upCameraInput.position.copyFromFloats(4, 2, 10);
            }
        }
    }
    getClosestAlpha() {
        return Math.round((this.alpha - (Math.PI / 4)) / (Math.PI / 2)) * Math.PI / 2 + Math.PI / 4;
    }
    moveTo(alpha, beta, radius, duration = 1) {
        if (this._locked) {
            return;
        }
        let alpha0 = Main.Camera.alpha;
        let beta0 = Main.Camera.beta;
        let radius0 = Main.Camera.radius;
        let t = 0;
        let step = () => {
            t += Main.Engine.getDeltaTime() / 1000;
            let d = t / duration;
            if (d >= 1) {
                Main.Camera.alpha = alpha;
                Main.Camera.beta = beta;
                Main.Camera.radius = radius;
                this._locked = false;
            }
            else {
                d = VMath.easeInOutSine(d);
                Main.Camera.alpha = (1 - d) * alpha0 + d * alpha;
                Main.Camera.beta = (1 - d) * beta0 + d * beta;
                Main.Camera.radius = (1 - d) * radius0 + d * radius;
                requestAnimationFrame(step);
            }
        };
        this._locked = true;
        step();
    }
    runLevelStartAnimation() {
        Main.Camera.radius = 50;
        this.moveTo(Math.PI / 2 * 2 + this.getClosestAlpha(), Math.PI / 3, Math.max(this.galaxy.width, this.galaxy.height, this.galaxy.depth) * 3, 1);
    }
}
class IJK {
    constructor(i, j, k) {
        this.i = i;
        this.j = j;
        this.k = k;
    }
    static IJK(iijk) {
        return new IJK(iijk.i, iijk.j, iijk.k);
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
class LevelStatus {
    static get instance() {
        if (!LevelStatus._instance) {
            LevelStatus._instance = new LevelStatus();
        }
        return LevelStatus._instance;
    }
    isLevelSolved(level) {
        let s = localStorage.getItem("level-status-" + level.toFixed(0));
        let v = parseInt(s);
        if (isFinite(v) && v > 0) {
            return true;
        }
        return false;
    }
    setLevelStatus(level, status) {
        if (status) {
            localStorage.setItem("level-status-" + level.toFixed(0), "1");
        }
        else {
            localStorage.setItem("level-status-" + level.toFixed(0), "0");
        }
    }
    setAllLevelsStatus(status) {
        for (let i = 1; i <= LEVEL_COUNT; i++) {
            this.setLevelStatus(i, status);
        }
    }
}
/// <reference path="../../lib/babylon.d.ts"/>
/// <reference path="../../lib/babylon.gui.d.ts"/>
var COS30 = Math.cos(Math.PI / 6);
// Note : First level is LEVEL 1
var LEVEL_COUNT = 5;
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
    static get orbMaterial() {
        if (!Main._orbMaterial) {
            Main._orbMaterial = new BABYLON.StandardMaterial("blue-material", Main.Scene);
            Main._orbMaterial.emissiveColor.copyFromFloats(0.8, 0.8, 1);
        }
        return Main._orbMaterial;
    }
    static get previewRedMaterial() {
        if (!Main._previewRedMaterial) {
            Main._previewRedMaterial = new BABYLON.StandardMaterial("preview-red-material", Main.Scene);
            Main._previewRedMaterial.diffuseColor.copyFromFloats(0.8, 0.2, 0.4);
            Main._previewRedMaterial.alpha = 0.7;
        }
        return Main._previewRedMaterial;
    }
    static get previewBlueMaterial() {
        if (!Main._previewBlueMaterial) {
            Main._previewBlueMaterial = new BABYLON.StandardMaterial("preview-blue-material", Main.Scene);
            Main._previewBlueMaterial.diffuseColor.copyFromFloats(0.4, 0.8, 0.9);
            Main._previewBlueMaterial.alpha = 0.7;
        }
        return Main._previewBlueMaterial;
    }
    constructor(canvasElement) {
        Main.Instance = this;
        Main.Canvas = document.getElementById(canvasElement);
        Main.Engine = new BABYLON.Engine(Main.Canvas, true, { preserveDrawingBuffer: true, stencil: true });
    }
    async initialize() {
        await this.initializeScene();
    }
    static EnableGlowLayer() {
        Main.DisableGlowLayer();
        Main.GlowLayer = new BABYLON.GlowLayer("glow", Main.Scene);
        Main.GlowLayer.intensity = 1;
    }
    static DisableGlowLayer() {
        if (Main.GlowLayer) {
            Main.GlowLayer.dispose();
            Main.GlowLayer = undefined;
        }
    }
    static ToggleGlowLayer() {
        if (Main.GlowLayer) {
            Main.DisableGlowLayer();
        }
        else {
            Main.EnableGlowLayer();
        }
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
                        if (material.name === "bottom") {
                            material.emissiveColor.copyFromFloats(0, 0, 0);
                        }
                    }
                });
                resolve(meshes[0]);
            });
        });
    }
    async initializeScene() {
        Main.Scene = new BABYLON.Scene(Main.Engine);
        Main.Galaxy = new Galaxy();
        Main.Camera = new GalaxyCamera(Main.Galaxy);
        Main.EnableGlowLayer();
        Main.Light = new BABYLON.HemisphericLight("AmbientLight", new BABYLON.Vector3(1, 3, 2), Main.Scene);
        Main.Skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 2000.0 }, Main.Scene);
        Main.Skybox.rotation.y = Math.PI / 2;
        Main.Skybox.infiniteDistance = true;
        let skyboxMaterial = new BABYLON.StandardMaterial("skyBox", Main.Scene);
        skyboxMaterial.backFaceCulling = false;
        Main.EnvironmentTexture = new BABYLON.CubeTexture("./assets/skyboxes/sky", Main.Scene, ["-px.png", "-py.png", "-pz.png", "-nx.png", "-ny.png", "-nz.png"]);
        skyboxMaterial.reflectionTexture = Main.EnvironmentTexture;
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
        skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        Main.Skybox.material = skyboxMaterial;
        Main.Scene.onBeforeRenderObservable.add(() => {
            Main.Skybox.rotation.y += 0.0001;
        });
        Main.MusicManager = new MusicManager();
        Main.SettingsManager = new SettingsManager();
        Main.SettingsManager.initialize();
        await Main.Galaxy.initialize();
        Main.Galaxy.instantiate();
        // Note : Uncomment this line to clear "Success" status saved on each level.
        // LevelStatus.instance.setAllLevelsStatus(false);
        for (let i = 1; i <= LEVEL_COUNT; i++) {
            document.getElementById("level-" + i).onclick = async () => {
                Main.Galaxy.editionMode = false;
                await Main.Galaxy.loadLevel(i);
                Main.MusicManager.play((i % 3) + 1, 3000);
                this.showUI();
                this.hideMainUI();
                Main.Camera.runLevelStartAnimation();
            };
        }
        document.getElementById("editor").onclick = () => {
            Main.Galaxy.editionMode = true;
            Main.Galaxy.width = 4;
            Main.Galaxy.height = 4;
            Main.Galaxy.depth = 4;
            Main.Galaxy.instantiate();
            this.showUI();
            this.hideMainUI();
            Main.Camera.runLevelStartAnimation();
        };
        document.getElementById("btn-menu").onclick = () => {
            this.hideUI();
            this.showMainUI();
            Main.Camera.runLevelStartAnimation();
        };
        document.getElementById("btn-clear-lightning").onclick = () => {
            Main.Galaxy.removeAllLightnings();
        };
        document.getElementById("btn-solve").onclick = () => {
            Main.Galaxy.solve();
        };
        document.getElementById("new-game").onclick = () => {
            document.getElementById("main-panel").classList.remove("show");
            this.showLevelChoiceUI();
        };
        document.getElementById("settings-btn").onclick = () => {
            document.getElementById("main-panel").classList.remove("show");
            document.getElementById("settings").classList.add("show");
        };
        document.getElementById("credits-btn").onclick = () => {
            document.getElementById("main-panel").classList.remove("show");
            document.getElementById("credits").classList.add("show");
        };
        document.getElementById("glow-toggle").onclick = () => {
            document.getElementById("glow-toggle").classList.toggle("on");
            Main.ToggleGlowLayer();
            window.localStorage.setItem("setting-glow-layer-enabled", Main.GlowLayer ? "true" : "false");
        };
        let settingGlowLayer = window.localStorage.getItem("setting-glow-layer-enabled");
        if (settingGlowLayer === "true") {
            console.log("Pouic");
            document.getElementById("glow-toggle").classList.add("on");
            Main.EnableGlowLayer();
        }
        else if (settingGlowLayer === "false") {
            console.log("Ploup");
            document.getElementById("glow-toggle").classList.remove("on");
            Main.DisableGlowLayer();
        }
        document.getElementById("free-camera-toggle").onclick = () => {
            document.getElementById("free-camera-toggle").classList.toggle("on");
        };
        document.getElementById("sound-toggle").onclick = () => {
            document.getElementById("sound-volume").classList.toggle("disabled");
            document.getElementById("sound-toggle").classList.toggle("on");
        };
        document.getElementById("music-toggle").onclick = () => {
            document.getElementById("music-volume").classList.toggle("disabled");
            document.getElementById("music-toggle").classList.toggle("on");
        };
        document.getElementById("level-upload").addEventListener("change", async (e) => {
            let data = await e.target.files[0].text();
            Main.Galaxy.doLoadLevel(JSON.parse(data));
        });
        const buttons = document.querySelectorAll('.back-button');
        [...buttons].map(btn => btn.addEventListener("click", this.backToMainMenu));
        this.hideUI();
        this.showMainUI();
        Main.Camera.runLevelStartAnimation();
    }
    showUI() {
        document.getElementById("ui").style.display = "block";
    }
    hideUI() {
        document.getElementById("ui").style.display = "none";
    }
    showMainUI() {
        document.getElementById("main-ui").style.display = "block";
        document.getElementById("levels-choice").classList.remove("show");
        document.getElementById("settings").classList.remove("show");
        document.getElementById("credits").classList.remove("show");
        document.getElementById("main-panel").classList.add("show");
        document.getElementById("victory").classList.remove("show");
        Main.MusicManager.play(0, 3000);
    }
    hideMainUI() {
        document.getElementById("main-ui").style.display = "none";
    }
    showLevelChoiceUI() {
        document.getElementById("levels-choice").classList.add("show");
        for (let i = 1; i <= LEVEL_COUNT; i++) {
            let isSolved = LevelStatus.instance.isLevelSolved(i);
            let e = document.querySelector("#level-" + i);
            if (isSolved) {
                e.classList.add("success");
                let d = document.createElement("div");
                d.classList.add("info");
                let iElement = document.createElement("i");
                iElement.classList.add("fas", "fa-check");
                let s = document.createElement("span");
                s.innerHTML = "&nbsp;Done&nbsp;!";
                d.appendChild(iElement);
                d.appendChild(s);
                e.appendChild(d);
            }
            else {
                e.classList.remove("success");
                let d = e.querySelector("div");
                if (d) {
                    d.remove();
                }
            }
        }
    }
    backToMainMenu() {
        document.getElementById("levels-choice").classList.remove("show");
        document.getElementById("settings").classList.remove("show");
        document.getElementById("credits").classList.remove("show");
        document.getElementById("victory").classList.remove("show");
        document.getElementById("main-panel").classList.add("show");
    }
    animate() {
        let fpsInfoElement = document.getElementById("fps-info");
        let meshesInfoTotalElement = document.getElementById("meshes-info-total");
        let meshesInfoNonStaticUniqueElement = document.getElementById("meshes-info-nonstatic-unique");
        let meshesInfoStaticUniqueElement = document.getElementById("meshes-info-static-unique");
        let meshesInfoNonStaticInstanceElement = document.getElementById("meshes-info-nonstatic-instance");
        let meshesInfoStaticInstanceElement = document.getElementById("meshes-info-static-instance");
        Main.Engine.runRenderLoop(() => {
            Main.Scene.render();
            fpsInfoElement.innerText = Main.Engine.getFps().toFixed(0) + " fps";
            let uniques = Main.Scene.meshes.filter(m => { return !(m instanceof BABYLON.InstancedMesh); });
            let uniquesNonStatic = uniques.filter(m => { return !m.isWorldMatrixFrozen; });
            let uniquesStatic = uniques.filter(m => { return m.isWorldMatrixFrozen; });
            let instances = Main.Scene.meshes.filter(m => { return m instanceof BABYLON.InstancedMesh; });
            let instancesNonStatic = instances.filter(m => { return !m.isWorldMatrixFrozen; });
            let instancesStatic = instances.filter(m => { return m.isWorldMatrixFrozen; });
            meshesInfoTotalElement.innerText = Main.Scene.meshes.length.toFixed(0).padStart(4, "0");
            meshesInfoNonStaticUniqueElement.innerText = uniquesNonStatic.length.toFixed(0).padStart(4, "0");
            meshesInfoStaticUniqueElement.innerText = uniquesStatic.length.toFixed(0).padStart(4, "0");
            meshesInfoNonStaticInstanceElement.innerText = instancesNonStatic.length.toFixed(0).padStart(4, "0");
            meshesInfoStaticInstanceElement.innerText = instancesStatic.length.toFixed(0).padStart(4, "0");
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
class MeshUtils {
    static ShrinkFattenMesh(baseMesh, dist) {
        let vertexData = new BABYLON.VertexData();
        let positions = [];
        let indices = [];
        let normals = [];
        let uvs = [];
        let originData = BABYLON.VertexData.ExtractFromMesh(baseMesh);
        let l = originData.positions.length / 3;
        for (let i = 0; i < l; i++) {
            let p = [originData.positions[3 * i], originData.positions[3 * i + 1], originData.positions[3 * i + 2]];
            let n = [originData.normals[3 * i], originData.normals[3 * i + 1], originData.normals[3 * i + 2]];
            p[0] += n[0] * dist;
            p[1] += n[1] * dist;
            p[2] += n[2] * dist;
            positions.push(...p);
        }
        indices.push(...originData.indices);
        normals.push(...originData.normals);
        uvs.push(...originData.uvs);
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.uvs = uvs;
        let mesh = new BABYLON.Mesh(baseMesh.name + "_transformed");
        vertexData.applyToMesh(mesh);
        return mesh;
    }
    static MergeTemplateIntoOneMeshTemplate(template) {
        let oneMeshTemplate = new BABYLON.Mesh("template");
        let vertexData = new BABYLON.VertexData();
        let positions = [];
        let indices = [];
        let normals = [];
        let uvs = [];
        let templateChildren = template.getChildMeshes();
        let materials = [];
        let indexStarts = [];
        let indexCounts = [];
        for (let i = 0; i < templateChildren.length; i++) {
            let child = templateChildren[i];
            if (child instanceof BABYLON.Mesh) {
                child.bakeCurrentTransformIntoVertices();
                let l = positions.length / 3;
                indexStarts.push(indices.length);
                let data = BABYLON.VertexData.ExtractFromMesh(child);
                positions.push(...data.positions);
                normals.push(...data.normals);
                uvs.push(...data.uvs);
                for (let i = 0; i < uvs.length / 2; i++) {
                    //uvs[2 * i + 1] = 1 - uvs[2 * i + 1];
                }
                for (let j = 0; j < data.indices.length / 3; j++) {
                    let i1 = data.indices[3 * j] + l;
                    let i2 = data.indices[3 * j + 1] + l;
                    let i3 = data.indices[3 * j + 2] + l;
                    indices.push(i1, i3, i2);
                }
                materials.push(child.material);
                indexCounts.push(data.indices.length);
            }
        }
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.uvs = uvs;
        vertexData.applyToMesh(oneMeshTemplate);
        if (materials.length > 0) {
            if (materials.length === 1 || materials.every(m => { return m === materials[0]; })) {
                oneMeshTemplate.material = materials[0];
            }
            else {
                for (let i = 0; i < materials.length; i++) {
                    BABYLON.SubMesh.CreateFromIndices(i, indexStarts[i], indexCounts[i], oneMeshTemplate);
                }
                let multiMaterial = new BABYLON.MultiMaterial("multi-material", Main.Scene);
                multiMaterial.subMaterials = materials;
                oneMeshTemplate.material = multiMaterial;
            }
        }
        return oneMeshTemplate;
    }
}
class MusicManager {
    constructor() {
        this._musicOn = true;
        this._currentVolume = 1;
        this.currentMusic = -1;
        this.musics = [];
        this.musics.push(new Audio("assets/musics/loop.mp3"));
        for (let i = 1; i <= 3; i++) {
            this.musics.push(new Audio("assets/musics/galaxies-" + i + ".mp3"));
        }
    }
    get musicOn() {
        return this._musicOn;
    }
    set musicOn(v) {
        this._musicOn = v;
        if (!this.musicOn) {
            if (this.getCurrentMusic()) {
                this.getCurrentMusic().volume = 0;
            }
        }
        else {
            if (this.getCurrentMusic()) {
                this.getCurrentMusic().volume = this.currentVolume;
            }
        }
    }
    get currentVolume() {
        return this._currentVolume;
    }
    set currentVolume(v) {
        this._currentVolume = v;
        if (this.getCurrentMusic()) {
            this.getCurrentMusic().volume = this._musicOn ? v : 0;
        }
    }
    getCurrentMusic() {
        return this.musics[this.currentMusic];
    }
    async play(track, transitionDuration = 1000) {
        await this._pauseCurrent(transitionDuration);
        this.currentMusic = track;
        await this._playCurrent(transitionDuration);
    }
    // Linearly increase volume for -duration- miliseconds, then pause. 
    async _playCurrent(transitionDuration = 1000) {
        let currentMusic = this.getCurrentMusic();
        if (!currentMusic) {
            return;
        }
        return new Promise(resolve => {
            let t = 0;
            currentMusic.play();
            currentMusic.loop = true;
            currentMusic.volume = 0;
            let update = () => {
                let dt = Main.Engine.getDeltaTime();
                t += dt;
                if (t < transitionDuration) {
                    currentMusic.volume = t / transitionDuration * (this._musicOn ? this.currentVolume : 0);
                }
                else {
                    currentMusic.volume = (this._musicOn ? this.currentVolume : 0);
                    Main.Scene.onBeforeRenderObservable.removeCallback(update);
                    resolve();
                }
            };
            Main.Scene.onBeforeRenderObservable.add(update);
        });
    }
    // Linearly decrease volume for -duration- miliseconds, then pause. 
    async _pauseCurrent(transitionDuration = 1000) {
        let currentMusic = this.getCurrentMusic();
        if (!currentMusic) {
            return;
        }
        return new Promise(resolve => {
            let t = 0;
            let update = () => {
                let dt = Main.Engine.getDeltaTime();
                t += dt;
                if (t < transitionDuration) {
                    currentMusic.volume = (1 - t / transitionDuration) * (this._musicOn ? this.currentVolume : 0);
                }
                else {
                    currentMusic.volume = 0;
                    currentMusic.pause();
                    Main.Scene.onBeforeRenderObservable.removeCallback(update);
                    resolve();
                }
            };
            Main.Scene.onBeforeRenderObservable.add(update);
        });
    }
}
class Plot extends GalaxyItem {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.poleType = 0;
        this.name = "plot-" + i + "-" + j + "-" + k;
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
            this.poleType = 0;
        }
        if (edges === 2) {
            this.poleType = 1;
        }
        if (edges === 3) {
            this.poleType = 2;
        }
    }
    instantiate() {
    }
}
class SettingsManager {
    constructor() {
        this.onFreeCameraUpdate = () => {
            requestAnimationFrame(() => {
                let v = this._freeCameraInput.classList.contains("on");
                Main.Camera.setFreeCamera(v);
                this.saveCurrentSettings();
            });
        };
        this.onMusicUpdate = () => {
            requestAnimationFrame(() => {
                let v = this._musicInput.classList.contains("on");
                Main.MusicManager.musicOn = v;
                this.saveCurrentSettings();
            });
        };
        this.onMusicVolumeUpdate = () => {
            let v = parseFloat(this._musicVolumeInput.value) / 100;
            Main.MusicManager.currentVolume = v;
            this.saveCurrentSettings();
        };
    }
    initialize() {
        this.registerUI();
        let settings = localStorage.getItem("galaxy-settings");
        if (settings) {
            let v = JSON.parse(settings);
            if (v.freeCamera === undefined) {
                v.freeCamera = true;
            }
            this.setSettings(v);
        }
    }
    registerUI() {
        let freeCameraInput = document.querySelector("#free-camera-toggle");
        if (freeCameraInput instanceof HTMLSpanElement) {
            this._freeCameraInput = freeCameraInput;
        }
        this._freeCameraInput.addEventListener("pointerup", this.onFreeCameraUpdate);
        let musicInput = document.querySelector("#music-toggle");
        if (musicInput instanceof HTMLSpanElement) {
            this._musicInput = musicInput;
        }
        this._musicInput.addEventListener("pointerup", this.onMusicUpdate);
        let musicVolumeInput = document.querySelector("#music-volume input");
        if (musicVolumeInput instanceof HTMLInputElement) {
            this._musicVolumeInput = musicVolumeInput;
        }
        this._musicVolumeInput.addEventListener("input", this.onMusicVolumeUpdate);
    }
    getSettings() {
        return {
            freeCamera: Main.Camera.useFreeCamera,
            music: Main.MusicManager.musicOn,
            musicVolume: Main.MusicManager.currentVolume
        };
    }
    setSettings(v) {
        if (v.freeCamera) {
            this._freeCameraInput.classList.remove("off");
            this._freeCameraInput.classList.add("on");
        }
        else {
            this._freeCameraInput.classList.remove("on");
            this._freeCameraInput.classList.add("off");
        }
        this.onFreeCameraUpdate();
        if (v.music) {
            this._musicInput.classList.remove("off");
            this._musicInput.classList.add("on");
            this._musicVolumeInput.parentElement.classList.remove("disabled");
        }
        else {
            this._musicInput.classList.add("off");
            this._musicInput.classList.remove("on");
            this._musicVolumeInput.parentElement.classList.add("disabled");
        }
        this.onMusicUpdate();
        if (isFinite(v.musicVolume)) {
            this._musicVolumeInput.value = (v.musicVolume * 100).toFixed(2);
            this.onMusicVolumeUpdate();
        }
    }
    saveCurrentSettings() {
        let settings = this.getSettings();
        localStorage.setItem("galaxy-settings", JSON.stringify(settings));
    }
}
/// <reference path="GalaxyItem.ts"/>
class Tile extends GalaxyItem {
    constructor(i, j, k, galaxy, isBlock = false) {
        super(i, j, k, galaxy);
        this.edges = [];
        this.neighbours = [];
        this._isValid = ZoneStatus.None;
        this._hasOrb = false;
        this.isBlock = false;
        this.name = "tile-" + i + "-" + j + "-" + k;
        this.isBlock = isBlock;
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
    get hasOrb() {
        return this._hasOrb && !this.isBlock;
    }
    setHasOrb(v) {
        if (!this.isBlock) {
            this._hasOrb = v;
        }
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
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        if (this.isBlock) {
            this.galaxy.templateTileBlock.createInstance("clone").parent = this;
        }
        else {
            if (this.hasOrb) {
                this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
                this.orbMesh.parent = this;
                this.orbMesh.position.y = 0.5;
                this.orbMesh.material = Main.orbMaterial;
            }
        }
        this.deepFreezeWorldMatrix();
    }
    refresh() {
        if (this.orbMesh) {
            this.orbMesh.dispose();
            this.orbMesh = undefined;
        }
        if (this.hasOrb) {
            this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
            this.orbMesh.parent = this;
            this.orbMesh.position.y = 0.5;
            this.orbMesh.material = Main.orbMaterial;
        }
        if (this.isBlock) {
            this.edges.forEach(edgeIJK => {
                let edgeItem = this.galaxy.getItem(edgeIJK);
                if (edgeItem instanceof EdgeBlock) {
                    edgeItem.isGeneratedByTile = true;
                    edgeItem.instantiate();
                }
                else {
                    if (edgeItem instanceof Lightning) {
                        edgeItem.dispose();
                        this.galaxy.setItem(undefined, edgeIJK);
                    }
                    this.galaxy.addEdgeBlock(edgeIJK).isGeneratedByTile = true;
                }
            });
        }
        else {
            this.edges.forEach(edgeIJK => {
                let edgeItem = this.galaxy.getItem(edgeIJK);
                if (edgeItem instanceof EdgeBlock && edgeItem.isGeneratedByTile) {
                    let other = this.getNeighbour(edgeItem.ijk);
                    if (!(other instanceof Tile && other.isBlock)) {
                        this.galaxy.removeEdgeBlock(edgeIJK);
                    }
                }
            });
        }
    }
    setIsValid(v) {
        if (v != this.isValid) {
            this._isValid = v;
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
    getNeighbour(ijk, offset = 0) {
        let index = this.getEdgeIndex(ijk);
        if (index != -1) {
            index = (index + offset) % 4;
            return this.neighbours[index];
        }
        return undefined;
    }
    getEdgeOrb() {
        for (let i = 0; i < 4; i++) {
            let ijk = this.edges[i];
            if (this.galaxy.getItem(ijk) instanceof EdgeOrb) {
                return ijk;
            }
        }
    }
    getEdgeOrbNeighbour() {
        for (let i = 0; i < 4; i++) {
            let ijk = this.edges[i];
            if (this.galaxy.getItem(ijk) instanceof EdgeOrb) {
                return this.getNeighbour(ijk);
            }
        }
    }
}
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
    static easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
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
    static StepAngle(from, to, step) {
        while (from < 0) {
            from += 2 * Math.PI;
        }
        while (to < 0) {
            to += 2 * Math.PI;
        }
        while (from >= 2 * Math.PI) {
            from -= 2 * Math.PI;
        }
        while (to >= 2 * Math.PI) {
            to -= 2 * Math.PI;
        }
        if (Math.abs(from - to) <= step) {
            return to;
        }
        if (to < from) {
            step *= -1;
        }
        if (Math.abs(from - to) > Math.PI) {
            step *= -1;
        }
        return from + step;
    }
    static LerpAngle(from, to, t) {
        while (from < 0) {
            from += 2 * Math.PI;
        }
        while (to < 0) {
            to += 2 * Math.PI;
        }
        while (from >= 2 * Math.PI) {
            from -= 2 * Math.PI;
        }
        while (to >= 2 * Math.PI) {
            to -= 2 * Math.PI;
        }
        if (Math.abs(from - to) > Math.PI) {
            if (from > Math.PI) {
                from -= 2 * Math.PI;
            }
            else {
                to -= 2 * Math.PI;
            }
        }
        return from * (1 - t) + to * t;
    }
    static AngularDistance(from, to) {
        while (from < 0) {
            from += 2 * Math.PI;
        }
        while (to < 0) {
            to += 2 * Math.PI;
        }
        while (from >= 2 * Math.PI) {
            from -= 2 * Math.PI;
        }
        while (to >= 2 * Math.PI) {
            to -= 2 * Math.PI;
        }
        let d = Math.abs(from - to);
        if (d > Math.PI) {
            d *= -1;
        }
        if (to < from) {
            d *= -1;
        }
        return d;
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
