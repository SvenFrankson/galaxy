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
            else if (odds === 1) {
                //return new Border(i, j, k, galaxy);
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
        if (ijk.i === 0) {
            up.x = -1;
        }
        else if (ijk.i === galaxy.width) {
            up.x = 1;
        }
        if (ijk.j === 0) {
            up.y = -1;
        }
        else if (ijk.j === galaxy.height) {
            up.y = 1;
        }
        if (ijk.k === 0) {
            up.z = -1;
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
/// <reference path="GalaxyItem.ts"/>
var DEBUG_SHOW_LOGICAL_EDGEBLOCK = false;
class Border extends GalaxyItem {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.name = "border-" + i + "-" + j + "-" + k;
        let up = this.getDirection(BABYLON.Axis.Y);
        this.position.addInPlace(up.scale(0.25));
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
class Lightning extends Border {
    instantiate() {
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        this.galaxy.templateLightning.createInstance("clone").parent = this;
        this.freezeWorldMatrix();
    }
}
class EdgeBlock extends Border {
    constructor(i, j, k, galaxy) {
        super(i, j, k, galaxy);
        this.isLogicalBlock = false;
    }
    instantiate() {
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
var GalaxyEditionActionType;
(function (GalaxyEditionActionType) {
    GalaxyEditionActionType[GalaxyEditionActionType["Play"] = 0] = "Play";
    GalaxyEditionActionType[GalaxyEditionActionType["Orb"] = 1] = "Orb";
    GalaxyEditionActionType[GalaxyEditionActionType["Block"] = 2] = "Block";
})(GalaxyEditionActionType || (GalaxyEditionActionType = {}));
class Galaxy extends BABYLON.TransformNode {
    constructor() {
        super("galaxy");
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
                    if (!this.previewMesh) {
                        this.previewMesh = this.templateLightning.clone("preview-mesh", undefined);
                        this.previewMesh.rotationQuaternion = BABYLON.Quaternion.Identity();
                    }
                    if (edge) {
                        this.previewMesh.material = Main.redMaterial;
                    }
                    else {
                        this.previewMesh.material = Main.whiteMaterial;
                    }
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
                    showPreviewmesh = true;
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
    }
    isIJKValid(ijk) {
        if (ijk.i === 0 || ijk.i === this.width || ijk.j === 0 || ijk.j === this.height || ijk.k === 0 || ijk.k === this.depth) {
            if (ijk.i >= 0 && ijk.i <= this.width && ijk.j >= 0 && ijk.j <= this.height && ijk.k >= 0 && ijk.k <= this.depth) {
                return true;
            }
        }
        return false;
    }
    mergeTemplateIntoOneMeshTemplate(template) {
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
        console.log(template);
        for (let i = 0; i < templateChildren.length; i++) {
            let child = templateChildren[i];
            if (child instanceof BABYLON.Mesh) {
                child.bakeCurrentTransformIntoVertices();
                console.log(child);
                console.log(child.position);
                console.log(child.rotation);
                console.log(child.rotationQuaternion);
                console.log(child.scaling);
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
                console.log("Hey !");
                for (let i = 0; i < materials.length; i++) {
                    BABYLON.SubMesh.CreateFromIndices(i, indexStarts[i], indexCounts[i], oneMeshTemplate);
                }
                let multiMaterial = new BABYLON.MultiMaterial("multi-material", Main.Scene);
                multiMaterial.subMaterials = materials;
                if (materials.length === 3) {
                    //multiMaterial.subMaterials = [Main.redMaterial, Main.greenMaterial, Main.blueMaterial];
                }
                oneMeshTemplate.material = multiMaterial;
            }
        }
        return oneMeshTemplate;
    }
    async initialize() {
        let templateTileRaw = await Main.loadMeshes("tile-lp");
        //this.templateTile = this.mergeTemplateIntoOneMeshTemplate(templateTileRaw);
        this.templateTile = templateTileRaw;
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
        let templateTileBlockRaw = await Main.loadMeshes("tile-block");
        this.templateTileBlock = templateTileBlockRaw;
        let templatePoleRaw = await Main.loadMeshes("pole");
        this.templatePole = this.mergeTemplateIntoOneMeshTemplate(templatePoleRaw);
        let templatePoleEdgeRaw = await Main.loadMeshes("pole");
        this.templatePoleEdge = this.mergeTemplateIntoOneMeshTemplate(templatePoleEdgeRaw);
        let templatePoleCornerRaw = await Main.loadMeshes("tripole");
        this.templatePoleCorner = this.mergeTemplateIntoOneMeshTemplate(templatePoleCornerRaw);
        let templateLightningRaw = await Main.loadMeshes("lightning");
        this.templateLightning = this.mergeTemplateIntoOneMeshTemplate(templateLightningRaw);
        let templateEdgeBlockRaw = await Main.loadMeshes("edge-block");
        this.templateEdgeBlock = this.mergeTemplateIntoOneMeshTemplate(templateEdgeBlockRaw);
    }
    async loadLevel(fileName) {
        return new Promise(resolve => {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', "assets/levels/" + fileName);
            xhr.onload = () => {
                let data = JSON.parse(xhr.responseText);
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
                    }
                }
                if (data.tileBlocks) {
                    for (let i = 0; i < data.tileBlocks.length; i++) {
                        let tileBlock = data.tileBlocks[i];
                        let tile = this.getItem(tileBlock.i, tileBlock.j, tileBlock.k);
                        if (tile && tile instanceof Tile) {
                            tile.isBlock = true;
                        }
                    }
                }
                if (data.edgeBlocks) {
                    for (let i = 0; i < data.edgeBlocks.length; i++) {
                        let edgeBlockData = data.edgeBlocks[i];
                        let edge = this.getItem(edgeBlockData.i, edgeBlockData.j, edgeBlockData.k);
                        if (!edge) {
                            let edgeBlock = new EdgeBlock(edgeBlockData.i, edgeBlockData.j, edgeBlockData.k, this);
                            this.setItem(edgeBlock, edgeBlockData.i, edgeBlockData.j, edgeBlockData.k);
                            edgeBlock.instantiate();
                        }
                    }
                }
                this.instantiate();
                resolve();
            };
            xhr.send();
        });
    }
    clear() {
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        this.items = [];
        this.tiles = [];
        this.poles = [];
    }
    instantiate() {
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
        if (this.tilesContainer) {
            this.tilesContainer.dispose();
        }
        this.tilesContainer = TileBuilder.GenerateGalaxyBase(this);
        this.tilesContainer.parent = this;
        Main.Scene.onPointerObservable.removeCallback(this.pointerObservable);
        Main.Scene.onPointerObservable.add(this.pointerObservable);
        Main.Scene.onBeforeRenderObservable.removeCallback(this.updateObservable);
        Main.Scene.onBeforeRenderObservable.add(this.updateObservable);
        if (this.editionMode) {
            document.getElementById("editor-part").style.display = "block";
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
            document.body.onkeyup = () => {
                this.galaxyEditionActionType = (this.galaxyEditionActionType + 1) % 3;
                let uiInfo = "";
                if (this.galaxyEditionActionType === GalaxyEditionActionType.Play) {
                    uiInfo = "Click : ADD LIGHTNING";
                }
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Orb) {
                    uiInfo = "Click : ADD ORB";
                }
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Block) {
                    uiInfo = "Click : ADD BLOCK";
                }
                document.getElementById("editor-action-type").innerText = uiInfo;
            };
        }
        else {
            document.getElementById("editor-part").style.display = "none";
        }
        this.updateZones();
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
        this.tilesGridContainer = TileBuilder.GenerateTileGrids(this);
        this.tilesGridContainer.parent = this;
        if (solved) {
            document.getElementById("solve-status").textContent = "SOLVED";
            document.getElementById("solve-status").style.color = "green";
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
        if (item instanceof Lightning) {
            item.dispose();
            this.setItem(undefined, ijk);
        }
        else {
            let border = new Lightning(ijk.i, ijk.j, ijk.k, this);
            border.instantiate();
            this.setItem(border, ijk);
        }
    }
    worldPositionToIJK(worldPosition) {
        let i = Math.round(worldPosition.x + this.width * 0.5);
        let j = Math.round(worldPosition.y + this.height * 0.5);
        let k = Math.round(worldPosition.z + this.depth * 0.5);
        return new IJK(i, j, k);
    }
    onPointerUp() {
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
                if (!this.editionMode || this.galaxyEditionActionType === GalaxyEditionActionType.Play) {
                    this.toggleLightning(ijk);
                    this.updateZones();
                }
                else {
                    if (this.galaxyEditionActionType === GalaxyEditionActionType.Block) {
                        let item = this.getItem(ijk);
                        if (item instanceof EdgeBlock) {
                            if (!item.isLogicalBlock) {
                                item.dispose();
                                this.setItem(undefined, ijk);
                            }
                        }
                        else {
                            if (item instanceof Lightning) {
                                item.dispose();
                                this.setItem(undefined, ijk);
                            }
                            let border = new EdgeBlock(ijk.i, ijk.j, ijk.k, this);
                            border.instantiate();
                            this.setItem(border, ijk);
                        }
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
                        if (this.tilesContainer) {
                            this.tilesContainer.dispose();
                        }
                        this.tilesContainer = TileBuilder.GenerateGalaxyBase(this);
                        this.tilesContainer.parent = this;
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
        data.tileBlocks = [];
        data.edgeBlocks = [];
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
                    if (item instanceof EdgeBlock && !item.isLogicalBlock) {
                        data.edgeBlocks.push({
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
/// <reference path="../../lib/babylon.d.ts"/>
/// <reference path="../../lib/babylon.gui.d.ts"/>
var COS30 = Math.cos(Math.PI / 6);
class Main {
    constructor(canvasElement) {
        Main.Canvas = document.getElementById(canvasElement);
        Main.Engine = new BABYLON.Engine(Main.Canvas, true, { preserveDrawingBuffer: true, stencil: true });
    }
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
                var gl = new BABYLON.GlowLayer("glow", Main.Scene);
                gl.intensity = 0.4;
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
    animateCamera() {
        Main.Camera.radius = 100;
        let step = () => {
            if (Main.Camera.radius > 25) {
                Main.Camera.radius *= 0.99;
                Main.Camera.alpha += 0.01;
                requestAnimationFrame(step);
            }
            else {
                Main.Camera.radius = 25;
            }
        };
        step();
    }
    async initializeScene() {
        Main.Scene = new BABYLON.Scene(Main.Engine);
        this.initializeCamera();
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
        Main.Galaxy = new Galaxy();
        await Main.Galaxy.initialize();
        Main.Galaxy.instantiate();
        for (let i = 1; i <= 5; i++) {
            document.getElementById("level-" + i).onclick = () => {
                Main.Galaxy.editionMode = false;
                Main.Galaxy.loadLevel("level-" + i + ".json");
                this.showUI();
                this.hideMainUI();
                this.animateCamera();
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
            this.animateCamera();
        };
        document.getElementById("btn-menu").onclick = () => {
            this.hideUI();
            this.showMainUI();
            this.animateCamera();
        };
        document.getElementById("new-game").onclick = () => {
            document.getElementById("main-panel").classList.remove("show");
            document.getElementById("levels-choice").classList.add("show");
        };
        const buttons = document.querySelectorAll('.back-button');
        [...buttons].map(btn => btn.addEventListener("click", this.backToMainMenu));
        this.hideUI();
        this.showMainUI();
        this.animateCamera();
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
        document.getElementById("main-panel").classList.add("show");
    }
    hideMainUI() {
        document.getElementById("main-ui").style.display = "none";
    }
    backToMainMenu() {
        document.getElementById("levels-choice").classList.remove("show");
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
        // test
        return;
        if (this.poleType === 0) {
            this.galaxy.templatePole.createInstance("clone").parent = this;
        }
        if (this.poleType === 1) {
            this.galaxy.templatePoleEdge.createInstance("clone").parent = this;
        }
        if (this.poleType === 2) {
            this.galaxy.templatePoleCorner.createInstance("clone").parent = this;
        }
        this.deepFreezeWorldMatrix();
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
            this.refreshTileMesh();
            if (this.hasOrb) {
                this.orbMesh = BABYLON.MeshBuilder.CreateSphere("orb", { segments: 8, diameter: 0.5 }, Main.Scene);
                this.orbMesh.parent = this;
                this.orbMesh.position.y = 0.5;
                this.orbMesh.material = Main.orbMaterial;
            }
        }
        this.deepFreezeWorldMatrix();
    }
    refreshTileMesh() {
        // test
        return;
        if (this.tileMesh) {
            this.tileMesh.dispose();
        }
        if (this.isValid === ZoneStatus.None) {
            //this.tileMesh = this.galaxy.templateTile.createInstance("clone");
            this.tileMesh = this.galaxy.templateTileGrid.createInstance("clone");
        }
        else if (this.isValid === ZoneStatus.Valid) {
            //this.tileMesh = this.galaxy.templateTileValid.createInstance("clone");
            this.tileMesh = this.galaxy.templateTileGridValid.createInstance("clone");
        }
        else if (this.isValid === ZoneStatus.Invalid) {
            //this.tileMesh = this.galaxy.templateTileInvalid.createInstance("clone");
            this.tileMesh = this.galaxy.templateTileGridInvalid.createInstance("clone");
        }
        if (this.tileMesh) {
            this.tileMesh.rotation.z = Math.PI;
            this.tileMesh.parent = this;
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
                    edgeItem.isLogicalBlock = true;
                    edgeItem.instantiate();
                }
                else {
                    if (edgeItem instanceof Lightning) {
                        edgeItem.dispose();
                        this.galaxy.setItem(undefined, edgeIJK);
                    }
                    let edgeBlock = new EdgeBlock(edgeIJK.i, edgeIJK.j, edgeIJK.k, this.galaxy);
                    edgeBlock.isLogicalBlock = true;
                    edgeBlock.instantiate();
                    this.galaxy.setItem(edgeBlock, edgeIJK);
                }
            });
        }
        else {
            this.edges.forEach(edgeIJK => {
                let edgeItem = this.galaxy.getItem(edgeIJK);
                if (edgeItem instanceof EdgeBlock && edgeItem.isLogicalBlock) {
                    let other = this.getNeighbour(edgeItem.ijk);
                    if (!(other instanceof Tile && other.isBlock)) {
                        edgeItem.dispose();
                        this.galaxy.setItem(undefined, edgeIJK);
                    }
                }
            });
        }
    }
    setIsValid(v) {
        if (v != this.isValid) {
            this._isValid = v;
            this.refreshTileMesh();
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
}
class TileBuilder {
    static GenerateGalaxyBase(galaxy) {
        let meshPartCount = 2 + 3 + 3;
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
        let container = new BABYLON.TransformNode("galaxy-base");
        for (let i = 0; i < meshPartCount; i++) {
            let partMesh = new BABYLON.Mesh("part-" + i);
            datas[i].positions = positions[i];
            datas[i].indices = indices[i];
            datas[i].normals = normals[i];
            datas[i].uvs = uvs[i];
            datas[i].applyToMesh(partMesh);
            partMesh.parent = container;
            partMesh.material = baseMaterials[i];
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
        let container = new BABYLON.TransformNode("galaxy-base");
        for (let i = 0; i < meshPartCount; i++) {
            let partMesh = new BABYLON.Mesh("part-" + i);
            datas[i].positions = positions[i];
            datas[i].indices = indices[i];
            datas[i].normals = normals[i];
            datas[i].uvs = uvs[i];
            datas[i].applyToMesh(partMesh);
            partMesh.parent = container;
            partMesh.material = baseMaterials[i];
        }
        return container;
    }
}
