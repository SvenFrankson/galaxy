enum ZoneStatus {
    None,
    Valid,
    Invalid
}

class IJK {
    
    constructor(
        public i: number,
        public j: number,
        public k: number
    ) {

    }

    public isEqual(other: IJK): boolean {
        return this.i === other.i && this.j === other.j && this.k === other.k;
    }

    public isTile(): boolean {
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

    public forEachAround(callback: (ijk: IJK) => void): void {
        callback(new IJK(this.i - 1, this.j, this.k));
        callback(new IJK(this.i, this.j - 1, this.k));
        callback(new IJK(this.i, this.j, this.k - 1));
        callback(new IJK(this.i + 1, this.j, this.k));
        callback(new IJK(this.i, this.j + 1, this.k));
        callback(new IJK(this.i, this.j, this.k + 1));
    }
}

enum GalaxyEditionActionType {
    Play,
    Orb,
    Block
}

class Galaxy extends BABYLON.TransformNode {

    public templateTile: BABYLON.Mesh;
    public templateTileGrid: BABYLON.Mesh;
	public templateTileGridValid: BABYLON.Mesh;
	public templateTileGridInvalid: BABYLON.Mesh;
	public templateTileBlock: BABYLON.Mesh;
	public templatePole: BABYLON.Mesh;
	public templatePoleEdge: BABYLON.Mesh;
	public templatePoleCorner: BABYLON.Mesh;
	public templateLightning: BABYLON.Mesh;
	public templateEdgeBlock: BABYLON.Mesh;

    public width: number = 10;
    public height: number = 6;
    public depth: number = 8;

    public items: GalaxyItem[][][];
    public tiles: Tile[];
    public poles: Plot[];
    public zones: Tile[][];

    public editionMode: boolean = false;
    public galaxyEditionActionType: GalaxyEditionActionType = GalaxyEditionActionType.Play;
    private _pointerDownX: number = NaN;
    private _pointerDownY: number = NaN;

    public previewMesh: BABYLON.AbstractMesh;
    public tilesContainer: BABYLON.TransformNode;
    public tilesGridContainer: BABYLON.TransformNode;

    constructor() {
        super("galaxy");
    }

    public isIJKValid(ijk: IJK): boolean {
        if (ijk.i === 0 || ijk.i === this.width || ijk.j === 0 || ijk.j === this.height || ijk.k === 0 || ijk.k === this.depth) {
            if (ijk.i >= 0 && ijk.i <= this.width && ijk.j >= 0 && ijk.j <= this.height && ijk.k >= 0 && ijk.k <= this.depth) {
                return true;
            }
        }
        return false;
    }

    private mergeTemplateIntoOneMeshTemplate(template: BABYLON.AbstractMesh): BABYLON.Mesh {
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

    public async initialize(): Promise<void> {
        let templateTileRaw = await Main.loadMeshes("tile-lp");

        //this.templateTile = this.mergeTemplateIntoOneMeshTemplate(templateTileRaw);
        this.templateTile = templateTileRaw as BABYLON.Mesh;

        this.templateTileGrid = (templateTileRaw.getChildMeshes()[2] as BABYLON.Mesh).clone("template-tile-grid");

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
        this.templateTileBlock = templateTileBlockRaw as BABYLON.Mesh;

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

    public async loadLevel(fileName: string): Promise<void> {
        return new Promise<void>(resolve => {
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
                            this.setItem(edgeBlock, edgeBlockData.i, edgeBlockData.j,edgeBlockData.k);
                            edgeBlock.instantiate();
                        }
                    }
                }
                this.instantiate();
                resolve();
            }
            xhr.send();
        });
    }

    public clear(): void {
        while (this.getChildren().length > 0) {
            let child = this.getChildren()[0];
            child.dispose();
        }
        this.items = [];
        this.tiles = [];
        this.poles = [];
    }

    public instantiate() {
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
            }
            document.getElementById("btn-width-inc").onclick = () => {
                this.width = this.width + 2;
                this.instantiate();
            }
            document.getElementById("height-value").textContent = this.height.toFixed(0);
            document.getElementById("btn-height-dec").onclick = () => {
                this.height = Math.max(2, this.height - 2);
                this.instantiate();
            }
            document.getElementById("btn-height-inc").onclick = () => {
                this.height = this.height + 2;
                this.instantiate();
            }
            document.getElementById("depth-value").textContent = this.depth.toFixed(0);
            document.getElementById("btn-depth-dec").onclick = () => {
                this.depth = Math.max(2, this.depth - 2);
                this.instantiate();
            }
            document.getElementById("btn-depth-inc").onclick = () => {
                this.depth = this.depth + 2;
                this.instantiate();
            }
            document.getElementById("btn-download").onclick = () => {
                let data = this.serialize();
                
                var tmpLink = document.createElement( 'a' );
                let name = "galaxy-editor";
                tmpLink.download = name + ".json";
                tmpLink.href = 'data:json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data));  
                
                document.body.appendChild( tmpLink );
                tmpLink.click(); 
                document.body.removeChild( tmpLink );
            }
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

    public updateZones(): void {
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
            })
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

    public areSymetrical(tileA: Tile, edgeA: IJK, tileB: Tile, edgeB: IJK, tilesToConsider: Tile[]): boolean {
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

    public isZoneValid(zone: Tile[]): ZoneStatus {
        let orbTile: Tile;
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

    private addToZone(zone: Tile[], tile: Tile, tiles: Tile[]): void {
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

    public getItem(ijk: IJK): GalaxyItem;
    public getItem(i: number, j: number, k: number): GalaxyItem;
    public getItem(a: IJK | number, j?: number, k?: number) : GalaxyItem {
        let i: number;
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

    public setItem(item: GalaxyItem, ijk: IJK): void;
    public setItem(item: GalaxyItem, i: number, j: number, k: number): void;
    public setItem(item: GalaxyItem, a: IJK | number, j?: number, k?: number) : void {
        let i: number;
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

    public toggleLightning(ijk: IJK): void {
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

    public worldPositionToIJK(worldPosition: BABYLON.Vector3): IJK {
        let i = Math.round(worldPosition.x + this.width * 0.5);
        let j = Math.round(worldPosition.y + this.height * 0.5);
        let k = Math.round(worldPosition.z + this.depth * 0.5);
        
        return new IJK(i, j, k);
    }

    public pointerObservable = (eventData: BABYLON.PointerInfo) => {
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
    }

    public updateObservable = () => {
        let pick = Main.Scene.pick(
            Main.Scene.pointerX,
            Main.Scene.pointerY
        );
        let showPreviewmesh: boolean = false;
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
                })
                this.previewMesh.position.copyFromFloats(
                    ijk.i - 0.5 * this.width,
                    ijk.j - 0.5 * this.height,
                    ijk.k - 0.5 * this.depth
                );
                GalaxyItem.UpdateRotationToRef(ijk, this, this.previewMesh.rotationQuaternion);
                Border.UpdateRotationToRef(ijk, this, this.previewMesh.rotationQuaternion);
                this.previewMesh.position.addInPlace(this.previewMesh.getDirection(BABYLON.Axis.Y).scale(0.25));
                this.previewMesh.isVisible = true;
                this.previewMesh.getChildMeshes().forEach(m => {
                    m.isVisible = true;
                })
                showPreviewmesh = true;
            }
        }
        if (!showPreviewmesh) {
            if (this.previewMesh) {
                this.previewMesh.isVisible = false;
                this.previewMesh.getChildMeshes().forEach(m => {
                    m.isVisible = false;
                })
            }
        }
    }

    public onPointerUp() {
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

    public serialize(): any {
        let data: any = {};
        data.width = this.width;
        data.height = this.height;
        data.depth = this.depth;
        data.orbTiles = [];
        data.tileBlocks = [];
        data.edgeBlocks = [];
        this.tiles.forEach(t => {
            if (t.hasOrb) {
                data.orbTiles.push(
                    {
                        i: t.i,
                        j: t.j,
                        k: t.k
                    }
                )
            }
            if (t.isBlock) {
                data.tileBlocks.push(
                    {
                        i: t.i,
                        j: t.j,
                        k: t.k
                    }
                )
            }
        });
        for (let i = 0; i <= this.width; i++) {
            for (let j = 0; j <= this.height; j++) {
                for (let k = 0; k <= this.depth; k++) {
                    let item = this.getItem(i, j, k);
                    if (item instanceof EdgeBlock && !item.isLogicalBlock) {
                        data.edgeBlocks.push(
                            {
                                i: item.i,
                                j: item.j,
                                k: item.k
                            }
                        )
                    }
                }
            }
        }
        return data;
    }
}