class BabylonPlus {

    public static CreateInstanceDeep(target: BABYLON.Mesh): BABYLON.AbstractMesh {
        let instance: BABYLON.AbstractMesh;
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