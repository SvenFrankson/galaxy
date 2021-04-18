enum ZoneStatus {
    None,
    Valid,
    Invalid
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
    public edgeOrbs: EdgeOrb[];
    public edgeBlocks: EdgeBlock[];
    public zones: Tile[][];

    public solution: IJK[];

    public editionMode: boolean = false;
    public galaxyEditionActionType: GalaxyEditionActionType = GalaxyEditionActionType.Play;
    private _pointerDownX: number = NaN;
    private _pointerDownY: number = NaN;

    public previewMesh: BABYLON.AbstractMesh;
    public tilesContainer: BABYLON.TransformNode;
    public tilesGridContainer: BABYLON.TransformNode;

    constructor() {
        super("galaxy");
        console.log("Create new Galaxy.");
    }

    public isIJKValid(ijk: IJK): boolean {
        if (ijk.i === 0 || ijk.i === this.width || ijk.j === 0 || ijk.j === this.height || ijk.k === 0 || ijk.k === this.depth) {
            if (ijk.i >= 0 && ijk.i <= this.width && ijk.j >= 0 && ijk.j <= this.height && ijk.k >= 0 && ijk.k <= this.depth) {
                return true;
            }
        }
        return false;
    }

    public async initialize(): Promise<void> {
        let templateTileRaw = await Main.loadMeshes("tile");
        this.templateTile = templateTileRaw as BABYLON.Mesh;

        let templateTileBlockRaw = await Main.loadMeshes("tile-block");
        this.templateTileBlock = templateTileBlockRaw as BABYLON.Mesh;

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
                resolve();
            }
            xhr.send();
        });
    }

    public clear(): void {
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

    public instantiate() {
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

    public rebuildTileContainer(): void {
        if (this.tilesContainer) {
            this.tilesContainer.dispose();
        }
        this.tilesContainer = GalaxyBuilder.GenerateGalaxyBase(this);
        this.tilesContainer.parent = this;
    }

    public registerToUI(): void {
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
            };
        }
        else {
            document.getElementById("editor-part").style.display = "none";
            document.getElementById("level-part").style.display = "block";
        }
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
            })
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
            }
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

        let orbEdge: IJK;
        let orbTiles: Tile[];
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
            let e0: IJK;
            let e1: IJK;
            let e2: IJK;
            let e3: IJK;
            let e4: IJK;
            let e5: IJK;
            let border0: GalaxyItem;
            let border1: GalaxyItem;
            let border2: GalaxyItem;
            let border3: GalaxyItem;
            let border4: GalaxyItem;
            let border5: GalaxyItem;

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
                                output = this.areSymetrical(tileC, e1, tileD, e5, tilesToConsider);
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

    private addToZone(zone: Tile[], tile: Tile, tiles: Tile[]): void {
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

    public removeAllLightnings(): void {
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

    public solve(): void {
        //this.removeAllLightnings();
        if (this.solution) {
            for (let i = 0; i < this.solution.length; i++) {
                this.toggleLightning(this.solution[i]);
                this.updateZones();
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

    public addEdgeOrb(ijk: IJK): EdgeOrb {
        let edgeOrb = new EdgeOrb(ijk.i, ijk.j, ijk.k, this);
        this.setItem(edgeOrb, ijk);
        edgeOrb.instantiate();
        this.edgeOrbs.push(edgeOrb);
        return edgeOrb;
    }

    public removeEdgeOrb(ijk: IJK): void {
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

    public addEdgeBlock(ijk: IJK): EdgeBlock {
        let edgeBlock = new EdgeBlock(ijk.i, ijk.j, ijk.k, this);
        this.setItem(edgeBlock, ijk);
        edgeBlock.instantiate();
        this.edgeBlocks.push(edgeBlock);
        return edgeBlock;
    }

    public removeEdgeBlock(ijk: IJK): void {
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

    public worldPositionToIJK(worldPosition: BABYLON.Vector3): IJK {
        let i = Math.round(worldPosition.x + this.width * 0.5);
        let j = Math.round(worldPosition.y + this.height * 0.5);
        let k = Math.round(worldPosition.z + this.depth * 0.5);

        i = Math.min(Math.max(i, 0), this.width);
        j = Math.min(Math.max(j, 0), this.height);
        k = Math.min(Math.max(k, 0), this.depth);
        
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
                showPreviewmesh = true;
                if (!this.previewMesh) {
                    this.previewMesh = BABYLON.MeshBuilder.CreateBox(
                        "preview-mesh",
                        {
                            width: 0.15,
                            height: 0.15,
                            depth: 1.8
                        }
                    );
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
                }
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
                else if (this.galaxyEditionActionType === GalaxyEditionActionType.Block) {
                    let item = this.getItem(ijk);
                    if (item instanceof EdgeBlock) {
                        if (!item.isGeneratedByTile) {
                            this.removeEdgeBlock(ijk);
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

    public serialize(): any {
        let data: any = {};
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
                    if (item instanceof EdgeBlock && !item.isGeneratedByTile) {
                        data.edgeBlocks.push(
                            {
                                i: item.i,
                                j: item.j,
                                k: item.k
                            }
                        )
                    }
                    if (item instanceof Lightning) {
                        data.lightnings.push(
                            {
                                i: item.i,
                                j: item.j,
                                k: item.k
                            }
                        )
                    }
                    if (item instanceof EdgeOrb) {
                        data.edgeOrbs.push(
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