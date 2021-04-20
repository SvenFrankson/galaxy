class GalaxyBuilder {

    public static GenerateGalaxyBase(galaxy: Galaxy): BABYLON.TransformNode {

        let meshPartCount = 2 + 3 + 3 + 1;
        let datas: BABYLON.VertexData[] = [];
        let positions: number[][] = [];
        let indices: number[][] = [];
        let normals: number[][] = [];
        let uvs: number[][] = [];

        for (let i = 0; i < meshPartCount; i++) {
            datas.push(new BABYLON.VertexData());
            positions.push([]);
            indices.push([]);
            normals.push([]);
            uvs.push([]);
        }

        let baseDatas: BABYLON.VertexData[] = [];
        let baseMaterials: BABYLON.Material[] = [];
        // Reference Tile meshes and materials.
        for (let i = 0; i < 2; i++) {
            let baseData = BABYLON.VertexData.ExtractFromMesh(galaxy.templateTile.getChildMeshes()[i] as BABYLON.Mesh);
            baseDatas.push(baseData);
            baseMaterials.push(galaxy.templateTile.getChildMeshes()[i].material);
        }

        // Reference TileBlock meshes and materials.
        for (let i = 0; i < 3; i++) {
            let baseData = BABYLON.VertexData.ExtractFromMesh(galaxy.templateTileBlock.getChildMeshes()[i] as BABYLON.Mesh);
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
                    p.copyFromFloats(
                        baseData.positions[3 * k],
                        baseData.positions[3 * k + 1],
                        - baseData.positions[3 * k + 2]
                    );
                    p.rotateByQuaternionToRef(tile.rotationQuaternion, p);
                    p.addInPlace(tile.position);
                    positions[j].push(p.x, p.y, p.z);
                }
                for (let k = 0; k < baseData.indices.length / 3; k++) {
                    indices[j].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
                }
                for (let k = 0; k < baseData.normals.length / 3; k++) {
                    n.copyFromFloats(
                        baseData.normals[3 * k],
                        baseData.normals[3 * k + 1],
                        - baseData.normals[3 * k + 2]
                    );
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
                p.copyFromFloats(
                    baseData.positions[3 * k],
                    baseData.positions[3 * k + 1],
                    - baseData.positions[3 * k + 2]
                );
                p.rotateByQuaternionToRef(pole.rotationQuaternion, p);
                p.addInPlace(pole.position);
                positions[baseIndex].push(p.x, p.y, p.z);
            }
            for (let k = 0; k < baseData.indices.length / 3; k++) {
                indices[baseIndex].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
            }
            for (let k = 0; k < baseData.normals.length / 3; k++) {
                n.copyFromFloats(
                    baseData.normals[3 * k],
                    baseData.normals[3 * k + 1],
                    - baseData.normals[3 * k + 2]
                );
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
                p.copyFromFloats(
                    baseData.positions[3 * k] * edgeBlock.scaling.x,
                    baseData.positions[3 * k + 1] * edgeBlock.scaling.y,
                    - baseData.positions[3 * k + 2] * edgeBlock.scaling.z
                );
                p.rotateByQuaternionToRef(edgeBlock.rotationQuaternion, p);
                p.addInPlace(edgeBlock.position);
                positions[baseIndex].push(p.x, p.y, p.z);
            }
            for (let k = 0; k < baseData.indices.length / 3; k++) {
                indices[baseIndex].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
            }
            for (let k = 0; k < baseData.normals.length / 3; k++) {
                n.copyFromFloats(
                    baseData.normals[3 * k],
                    baseData.normals[3 * k + 1],
                    - baseData.normals[3 * k + 2]
                );
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

    public static GenerateTileGrids(galaxy: Galaxy): BABYLON.TransformNode {
        let meshPartCount = 3;
        let datas: BABYLON.VertexData[] = [];
        let positions: number[][] = [];
        let indices: number[][] = [];
        let normals: number[][] = [];
        let uvs: number[][] = [];

        for (let i = 0; i < meshPartCount; i++) {
            datas.push(new BABYLON.VertexData());
            positions.push([]);
            indices.push([]);
            normals.push([]);
            uvs.push([]);
        }

        let baseDatas: BABYLON.VertexData[] = [];
        let baseMaterials: BABYLON.Material[] = [];
        
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
                    p.copyFromFloats(
                        baseData.positions[3 * k],
                        baseData.positions[3 * k + 1],
                        - baseData.positions[3 * k + 2]
                    );
                    p.rotateByQuaternionToRef(tile.rotationQuaternion, p);
                    p.addInPlace(tile.position);
                    positions[baseIndex].push(p.x, p.y, p.z);
                }
                for (let k = 0; k < baseData.indices.length / 3; k++) {
                    indices[baseIndex].push(baseData.indices[3 * k] + l, baseData.indices[3 * k + 1] + l, baseData.indices[3 * k + 2] + l);
                }
                for (let k = 0; k < baseData.normals.length / 3; k++) {
                    n.copyFromFloats(
                        baseData.normals[3 * k],
                        baseData.normals[3 * k + 1],
                        - baseData.normals[3 * k + 2]
                    );
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