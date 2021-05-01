class GalaxyCamera extends BABYLON.ArcRotateCamera {

    public useFreeCamera: boolean = true;

	public targetAlpha: number = Math.PI / 4;
	public targetBeta: number = Math.PI / 3;

	public leftCameraInput: BABYLON.Mesh;
	public rightCameraInput: BABYLON.Mesh;
	public downCameraInput: BABYLON.Mesh;
	public upCameraInput: BABYLON.Mesh;

    public get scene(): BABYLON.Scene {
        return this.getScene();
    }

    constructor(
        public galaxy: Galaxy
    ) {
		super("camera", 0, 0, 10, BABYLON.Vector3.Zero(), Main.Scene);
		this.setPosition(new BABYLON.Vector3(-2, 6, - 10));
		this.attachControl(Main.Canvas);
		this.wheelPrecision *= 10;
    }

	public setFreeCamera(freeCamera: boolean): void {
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

	public updateCamera = () => {
		this.alpha = VMath.StepAngle(this.alpha, this.targetAlpha, 0.02);
		this.beta = VMath.StepAngle(this.beta, this.targetBeta, 0.02);
	}

    public runLevelStartAnimation(): void {
        Main.Camera.radius = 100;
        this.scene.onBeforeRenderObservable.removeCallback(this.updateCamera);
        let step = () => {
            if (Main.Camera.radius > 25) {
				Main.Camera.radius *= 0.99;
				Main.Camera.alpha += 0.01;
                requestAnimationFrame(step);
			}
			else {
				Main.Camera.radius = 25;
                if (!this.useFreeCamera) {
                    this.scene.onBeforeRenderObservable.add(this.updateCamera);
                }
			}
        }
        step();
    }
}