/// <reference path="../../lib/babylon.d.ts"/>
/// <reference path="../../lib/babylon.gui.d.ts"/>

var COS30 = Math.cos(Math.PI / 6);

class Main {

    public static Canvas: HTMLCanvasElement;
    public static Engine: BABYLON.Engine;
    public static Scene: BABYLON.Scene;
	public static Light: BABYLON.Light;
	private static _CameraPosition: BABYLON.Vector2;
	public static get CameraPosition(): BABYLON.Vector2 {
		if (!Main._CameraPosition) {
			Main._CameraPosition = BABYLON.Vector2.Zero();
		}
		return Main._CameraPosition;
	}
	public static set CameraPosition(p: BABYLON.Vector2) {
		Main._CameraPosition = p;
	}
	public static Camera: BABYLON.ArcRotateCamera;

	public static _redMaterial: BABYLON.StandardMaterial;
	public static get redMaterial(): BABYLON.StandardMaterial {
		if (!Main._redMaterial) {
			Main._redMaterial = new BABYLON.StandardMaterial("red-material", Main.Scene);
			Main._redMaterial.diffuseColor.copyFromFloats(0.9, 0.1, 0.1);
			Main._redMaterial.emissiveColor.copyFromFloats(0.45, 0.05, 0.05);
		}
		return Main._redMaterial;
	}

	public static _greenMaterial: BABYLON.StandardMaterial;
	public static get greenMaterial(): BABYLON.StandardMaterial {
		if (!Main._greenMaterial) {
			Main._greenMaterial = new BABYLON.StandardMaterial("green-material", Main.Scene);
			Main._greenMaterial.diffuseColor.copyFromFloats(0.1, 0.9, 0.1);
			Main._greenMaterial.emissiveColor.copyFromFloats(0.05, 0.45, 0.05);
		}
		return Main._greenMaterial;
	}

	public static _blueMaterial: BABYLON.StandardMaterial;
	public static get blueMaterial(): BABYLON.StandardMaterial {
		if (!Main._blueMaterial) {
			Main._blueMaterial = new BABYLON.StandardMaterial("blue-material", Main.Scene);
			Main._blueMaterial.diffuseColor.copyFromFloats(0.1, 0.1, 0.9);
			Main._blueMaterial.emissiveColor.copyFromFloats(0.05, 0.05, 0.45);
		}
		return Main._blueMaterial;
	}

	public static _whiteMaterial: BABYLON.StandardMaterial;
	public static get whiteMaterial(): BABYLON.StandardMaterial {
		if (!Main._whiteMaterial) {
			Main._whiteMaterial = new BABYLON.StandardMaterial("white-material", Main.Scene);
			Main._whiteMaterial.diffuseColor.copyFromFloats(0.9, 0.9, 0.9);
			Main._whiteMaterial.emissiveColor.copyFromFloats(0.45, 0.45, 0.45);
		}
		return Main._whiteMaterial;
	}

    constructor(canvasElement: string) {
        Main.Canvas = document.getElementById(canvasElement) as HTMLCanvasElement;
        Main.Engine = new BABYLON.Engine(Main.Canvas, true, { preserveDrawingBuffer: true, stencil: true });
	}

	public initializeCamera(): void {
		Main.Camera = new BABYLON.ArcRotateCamera("camera", 0, 0, 10, BABYLON.Vector3.Zero(), Main.Scene);
		Main.Camera.setPosition(new BABYLON.Vector3(-2, 6, - 10));
		Main.Camera.attachControl(Main.Canvas);
		Main.Camera.wheelPrecision *= 10;
	}
	
	public async initialize(): Promise<void> {
		await this.initializeScene();
	}

	public static async loadMeshes(modelName: string): Promise<BABYLON.AbstractMesh> {
		return new Promise<BABYLON.AbstractMesh> (
			resolve => {
				BABYLON.SceneLoader.ImportMesh(
					"",
					"./assets/models/" + modelName + ".glb",
					"",
					Main.Scene,
					(meshes) => {
						console.log("Load model : " + modelName);
						meshes.forEach(
							(mesh) => {
								let material = mesh.material;
								if (material instanceof BABYLON.PBRMaterial) {
									console.log("PBRMaterial " + material.name + " loaded.");
									if (material.name === "grid") {
										material.transparencyMode = undefined;
										material.albedoTexture.hasAlpha = true;
									}
								}
							}
						)
						resolve(meshes[0]);
					}
				)
			}
		);
	}

    public async initializeScene(): Promise<void> {
		Main.Scene = new BABYLON.Scene(Main.Engine);

		this.initializeCamera();

        Main.Light = new BABYLON.HemisphericLight("AmbientLight", new BABYLON.Vector3(1, 3, 2), Main.Scene);

		let galaxy = new Galaxy();
		galaxy.editionMode = true;
		await galaxy.initialize();
		galaxy.loadLevel("level-1.json");
    }

    public animate(): void {
        Main.Engine.runRenderLoop(() => {
			Main.Scene.render();
        });

        window.addEventListener("resize", () => {
            Main.Engine.resize();
        });
    }
}

window.addEventListener("load", async () => {
	let main: Main = new Main("render-canvas");
	await main.initialize();
	main.animate();
})