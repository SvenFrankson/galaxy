class MeshUtils {

    public static ShrinkFattenMesh(baseMesh: BABYLON.Mesh, dist: number): BABYLON.Mesh {
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

    public static MergeTemplateIntoOneMeshTemplate(template: BABYLON.AbstractMesh): BABYLON.Mesh {
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