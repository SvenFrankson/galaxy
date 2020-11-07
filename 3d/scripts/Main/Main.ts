/// <reference path="../../lib/babylon.d.ts"/>
/// <reference path="../../lib/babylon.gui.d.ts"/>

var COS30 = Math.cos(Math.PI / 6);

class Main {

    public static Canvas: HTMLCanvasElement;
    public static Engine: BABYLON.Engine;
    public static Scene: BABYLON.Scene;
	public static Light: BABYLON.Light;
	public static Galaxy: Galaxy;
	public static Skybox: BABYLON.Mesh;
	public static EnvironmentTexture: BABYLON.CubeTexture;

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
			Main._blueMaterial.emissiveColor.copyFromFloats(0.8, 0.8, 1);
		}
		return Main._blueMaterial;
	}

	public static _orbMaterial: BABYLON.StandardMaterial;
	public static get orbMaterial(): BABYLON.StandardMaterial {
		if (!Main._orbMaterial) {
			Main._orbMaterial = new BABYLON.StandardMaterial("blue-material", Main.Scene);
			Main._orbMaterial.emissiveColor.copyFromFloats(0.8, 0.8, 1);
		}
		return Main._orbMaterial;
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
						var gl = new BABYLON.GlowLayer("glow", Main.Scene);
						gl.intensity = 0.4;		
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

    public animateCamera(): void {
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
        }
        step();
    }

    public async initializeScene(): Promise<void> {
		Main.Scene = new BABYLON.Scene(Main.Engine);

		this.initializeCamera();

		Main.Light = new BABYLON.HemisphericLight("AmbientLight", new BABYLON.Vector3(1, 3, 2), Main.Scene);
		
		Main.Skybox = BABYLON.MeshBuilder.CreateBox("skyBox", { size: 2000.0 }, Main.Scene);
		Main.Skybox.rotation.y = Math.PI / 2;
		Main.Skybox.infiniteDistance = true;
		let skyboxMaterial: BABYLON.StandardMaterial = new BABYLON.StandardMaterial("skyBox", Main.Scene);
		skyboxMaterial.backFaceCulling = false;
		Main.EnvironmentTexture = new BABYLON.CubeTexture(
			"./assets/skyboxes/sky",
			Main.Scene,
			["-px.png", "-py.png", "-pz.png", "-nx.png", "-ny.png", "-nz.png"]);
		skyboxMaterial.reflectionTexture = Main.EnvironmentTexture;
		skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
		skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
		skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
		Main.Skybox.material = skyboxMaterial;

		Main.Scene.onBeforeRenderObservable.add(
			() => {
				Main.Skybox.rotation.y += 0.0001;
			}
		)


		Main.Galaxy = new Galaxy();
		await Main.Galaxy.initialize();
		Main.Galaxy.instantiate();

		for (let i = 1; i <= 3; i++) {
			document.getElementById("btn-level-" + i).onclick = () => {
				Main.Galaxy.editionMode = false;
				Main.Galaxy.loadLevel("level-" + i + ".json");
				this.showUI();
				this.hideLevelSelection();
				this.animateCamera();
			}
		}
		document.getElementById("btn-editor").onclick = () => {
			Main.Galaxy.editionMode = true;
			Main.Galaxy.width = 4;
			Main.Galaxy.height = 4;
			Main.Galaxy.depth = 4;
			Main.Galaxy.instantiate();
			this.showUI();
			this.hideLevelSelection();
			this.animateCamera();
		}
		document.getElementById("btn-menu").onclick = () => {
			this.hideUI();
			this.showLevelSelection();
			this.animateCamera();
		}
		this.hideUI();
		this.showLevelSelection();
		this.animateCamera();
	}

	private _tIdleCamera: number = 0;
	private _idleCamera = () => {
		if (Main.Camera.radius === 25) {
			let betaTarget = (Math.PI / 2 - Math.PI / 8) + Math.sin(this._tIdleCamera) * Math.PI / 8;
			Main.Galaxy.rotation.y += 0.002;
			Main.Camera.beta = Main.Camera.beta * 0.995 + betaTarget * 0.005;
			this._tIdleCamera += 0.002;
		}
	}
	
	public showUI(): void {
		document.getElementById("ui").style.display = "block";
	}
	
	public hideUI(): void {
		document.getElementById("ui").style.display = "none";
	}
	
	public showLevelSelection(): void {
		document.getElementById("level-selection").style.display = "block";
		Main.Scene.onBeforeRenderObservable.removeCallback(this._idleCamera);
		Main.Scene.onBeforeRenderObservable.add(this._idleCamera);
	}
	
	public hideLevelSelection(): void {
		document.getElementById("level-selection").style.display = "none";
		Main.Scene.onBeforeRenderObservable.removeCallback(this._idleCamera);
	}

    public animate(): void {
		let fpsInfoElement = document.getElementById("fps-info");
        Main.Engine.runRenderLoop(() => {
			Main.Scene.render();
			fpsInfoElement.innerText = Main.Engine.getFps().toFixed(0) + " fps"
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