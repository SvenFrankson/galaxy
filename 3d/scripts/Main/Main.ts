/// <reference path="../../lib/babylon.d.ts"/>
/// <reference path="../../lib/babylon.gui.d.ts"/>

var COS30 = Math.cos(Math.PI / 6);
// Note : First level is LEVEL 1
var LEVEL_COUNT = 5;

class Main {

	public static Instance: Main;
    public static Canvas: HTMLCanvasElement;
    public static Engine: BABYLON.Engine;
    public static Scene: BABYLON.Scene;
	public static Light: BABYLON.Light;
	public static Galaxy: Galaxy;
	public static MusicManager: MusicManager;
	public static SettingsManager: SettingsManager;
	public static Skybox: BABYLON.Mesh;
	public static EnvironmentTexture: BABYLON.CubeTexture;
	public static GlowLayer: BABYLON.GlowLayer;
	public static UseFreeCamera: boolean = true;

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
		}
		return Main._redMaterial;
	}

	public static _greenMaterial: BABYLON.StandardMaterial;
	public static get greenMaterial(): BABYLON.StandardMaterial {
		if (!Main._greenMaterial) {
			Main._greenMaterial = new BABYLON.StandardMaterial("green-material", Main.Scene);
			Main._greenMaterial.diffuseColor.copyFromFloats(0.1, 0.9, 0.1);
		}
		return Main._greenMaterial;
	}

	public static _blueMaterial: BABYLON.StandardMaterial;
	public static get blueMaterial(): BABYLON.StandardMaterial {
		if (!Main._blueMaterial) {
			Main._blueMaterial = new BABYLON.StandardMaterial("blue-material", Main.Scene);
			Main._blueMaterial.diffuseColor.copyFromFloats(0.1, 0.1, 0.9);
		}
		return Main._blueMaterial;
	}

	public static _whiteMaterial: BABYLON.StandardMaterial;
	public static get whiteMaterial(): BABYLON.StandardMaterial {
		if (!Main._whiteMaterial) {
			Main._whiteMaterial = new BABYLON.StandardMaterial("white-material", Main.Scene);
			Main._whiteMaterial.diffuseColor.copyFromFloats(0.9, 0.9, 0.9);
		}
		return Main._whiteMaterial;
	}

	public static _orbMaterial: BABYLON.StandardMaterial;
	public static get orbMaterial(): BABYLON.StandardMaterial {
		if (!Main._orbMaterial) {
			Main._orbMaterial = new BABYLON.StandardMaterial("blue-material", Main.Scene);
			Main._orbMaterial.emissiveColor.copyFromFloats(0.8, 0.8, 1);
		}
		return Main._orbMaterial;
	}

	public static _previewRedMaterial: BABYLON.StandardMaterial;
	public static get previewRedMaterial(): BABYLON.StandardMaterial {
		if (!Main._previewRedMaterial) {
			Main._previewRedMaterial = new BABYLON.StandardMaterial("preview-red-material", Main.Scene);
			Main._previewRedMaterial.diffuseColor.copyFromFloats(0.8, 0.2, 0.4);
			Main._previewRedMaterial.alpha = 0.7;
		}
		return Main._previewRedMaterial;
	}

	public static _previewBlueMaterial: BABYLON.StandardMaterial;
	public static get previewBlueMaterial(): BABYLON.StandardMaterial {
		if (!Main._previewBlueMaterial) {
			Main._previewBlueMaterial = new BABYLON.StandardMaterial("preview-blue-material", Main.Scene);
			Main._previewBlueMaterial.diffuseColor.copyFromFloats(0.4, 0.8, 0.9);
			Main._previewBlueMaterial.alpha = 0.7;
		}
		return Main._previewBlueMaterial;
	}

    constructor(canvasElement: string) {
		Main.Instance = this;
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

	public static EnableGlowLayer(): void {
		Main.DisableGlowLayer();	
		Main.GlowLayer = new BABYLON.GlowLayer("glow", Main.Scene);
		Main.GlowLayer.intensity = 1;
	}

	public static DisableGlowLayer(): void {
		if (Main.GlowLayer) {
			Main.GlowLayer.dispose();
			Main.GlowLayer = undefined;
		}
	}

	public static ToggleGlowLayer(): void {
		if (Main.GlowLayer) {
			Main.DisableGlowLayer();
		}
		else {
			Main.EnableGlowLayer();
		}
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
									if (material.name === "bottom") {
										material.emissiveColor.copyFromFloats(0, 0, 0);
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

	public static CameraTargetAlpha: number = Math.PI / 4;
	public static CameraTargetBeta: number = Math.PI / 3;

	public leftCameraInput: BABYLON.Mesh;
	public rightCameraInput: BABYLON.Mesh;
	public downCameraInput: BABYLON.Mesh;
	public upCameraInput: BABYLON.Mesh;

	public updateCamera = () => {
		Main.Camera.alpha = VMath.StepAngle(Main.Camera.alpha, Main.CameraTargetAlpha, 0.02);
		Main.Camera.beta = VMath.StepAngle(Main.Camera.beta, Main.CameraTargetBeta, 0.02);
	}

	public setFreeCamera(freeCamera: boolean): void {
		if (Main.UseFreeCamera != freeCamera) {
			Main.UseFreeCamera = freeCamera;
			if (Main.UseFreeCamera) {
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
	

    public async initializeScene(): Promise<void> {
		Main.Scene = new BABYLON.Scene(Main.Engine);

		this.initializeCamera();

		Main.EnableGlowLayer();

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

		Main.MusicManager = new MusicManager();
		Main.SettingsManager = new SettingsManager();
		Main.SettingsManager.initialize();

		Main.Galaxy = new Galaxy();
		await Main.Galaxy.initialize();
		Main.Galaxy.instantiate();

		// Note : Uncomment this line to clear "Success" status saved on each level.
		// LevelStatus.instance.setAllLevelsStatus(false);

		for (let i = 1; i <= LEVEL_COUNT; i++) {
			document.getElementById("level-" + i).onclick = () => {
				Main.Galaxy.editionMode = false;
				Main.Galaxy.loadLevel(i);
				Main.MusicManager.play((i % 3) + 1, 3000);
				this.showUI();
				this.hideMainUI();
				this.animateCamera();
			}
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
		}
		document.getElementById("btn-menu").onclick = () => {
			this.hideUI();
			this.showMainUI();
			this.animateCamera();
		}
		document.getElementById("btn-clear-lightning").onclick = () => {
			Main.Galaxy.removeAllLightnings();
		}
		document.getElementById("btn-solve").onclick = () => {
			Main.Galaxy.solve();
		}
		document.getElementById("new-game").onclick = () => {
			document.getElementById("main-panel").classList.remove("show");
			this.showLevelChoiceUI();
		}
		document.getElementById("settings-btn").onclick = () => {
			document.getElementById("main-panel").classList.remove("show");
			document.getElementById("settings").classList.add("show");
		}
		document.getElementById("credits-btn").onclick = () => {
			document.getElementById("main-panel").classList.remove("show");
			document.getElementById("credits").classList.add("show");
		}
		document.getElementById("glow-toggle").onclick = () => {
			document.getElementById("glow-toggle").classList.toggle("on");
			Main.ToggleGlowLayer();
			window.localStorage.setItem("setting-glow-layer-enabled", Main.GlowLayer ? "true" : "false");
		}
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
		}
		document.getElementById("sound-toggle").onclick = () => {
			document.getElementById("sound-volume").classList.toggle("disabled");
			document.getElementById("sound-toggle").classList.toggle("on");
		}
		document.getElementById("music-toggle").onclick = () => {
			document.getElementById("music-volume").classList.toggle("disabled");
			document.getElementById("music-toggle").classList.toggle("on");
		}
		document.getElementById("level-upload").addEventListener("change", async (e) => {
			let data = await (e.target as HTMLInputElement).files[0].text();
			Main.Galaxy.doLoadLevel(JSON.parse(data));
		});

		const buttons = document.querySelectorAll('.back-button');
		[...buttons].map( btn => btn.addEventListener("click", this.backToMainMenu));

		this.hideUI();
		this.showMainUI();
		this.animateCamera();
	}
	
	public showUI(): void {
		document.getElementById("ui").style.display = "block";
	}
	
	public hideUI(): void {
		document.getElementById("ui").style.display = "none";
	}
	
	public showMainUI(): void {
		document.getElementById("main-ui").style.display = "block";
		document.getElementById("levels-choice").classList.remove("show");
		document.getElementById("settings").classList.remove("show");
		document.getElementById("credits").classList.remove("show");
		document.getElementById("main-panel").classList.add("show");
		document.getElementById("victory").classList.remove("show");
		Main.MusicManager.play(0, 3000);
	}
	
	public hideMainUI(): void {
		document.getElementById("main-ui").style.display = "none";
	}

	public showLevelChoiceUI(): void {
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

	public backToMainMenu() {
		document.getElementById("levels-choice").classList.remove("show");
		document.getElementById("settings").classList.remove("show");
		document.getElementById("credits").classList.remove("show");
		document.getElementById("victory").classList.remove("show");
		document.getElementById("main-panel").classList.add("show");
	}

    public animate(): void {
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
	let main: Main = new Main("render-canvas");
	await main.initialize();
	main.animate();
})