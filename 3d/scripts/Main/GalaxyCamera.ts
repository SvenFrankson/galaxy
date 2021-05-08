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

    private _alphaSpeed: number = 0;
    private _betaSpeed: number = 0;

	public getClosestAlpha(): number {
		return Math.round((this.alpha - (Math.PI / 4)) / (Math.PI / 2)) * Math.PI / 2 + Math.PI / 4;
	}

	public updateCamera = () => {
		/*
        let dt = Main.Engine.getDeltaTime() / 1000;

        this._alphaSpeed += Math.abs(VMath.AngularDistance(this.alpha, this.targetAlpha)) / (2 * Math.PI) * 0.2 * dt;
        this._betaSpeed += VMath.AngularDistance(this.beta, this.targetBeta) / (2 * Math.PI) * 0.2 * dt;
        this._alphaSpeed *= 0.99;
        this._betaSpeed *= 0.99;

		this.alpha = VMath.StepAngle(this.alpha, this.targetAlpha, this._alphaSpeed);
		this.beta = VMath.StepAngle(this.beta, this.targetBeta, this._betaSpeed);
		*/
	}

	private _locked: boolean = false;
	public moveTo(alpha: number, beta: number, radius: number, duration: number = 1): void {
		if (this._locked) {
			return;
		}
		let alpha0 = Main.Camera.alpha;
		let beta0 = Main.Camera.beta;
		let radius0 = Main.Camera.radius;

		let t = 0;
		let step = () => {
			t += Main.Engine.getDeltaTime() / 1000;
			let d = t / duration;
			if (d >= 1) {
				Main.Camera.alpha = alpha;
				Main.Camera.beta = beta;
				Main.Camera.radius = radius;
				this._locked = false;
			}
			else {
				d = VMath.easeInOutSine(d);
				Main.Camera.alpha = (1 - d) * alpha0 + d * alpha;
				Main.Camera.beta = (1 - d) * beta0 + d * beta;
				Main.Camera.radius = (1 - d) * radius0 + d * radius;
				requestAnimationFrame(step);
			}
		}
		this._locked = true;
		step();
	}

    public runLevelStartAnimation(): void {
        Main.Camera.radius = 50;
		this.moveTo(Math.PI / 2 * 2 + this.getClosestAlpha(), Math.PI / 3, Math.max(this.galaxy.width, this.galaxy.height, this.galaxy.depth) * 3, 1);
    }
}