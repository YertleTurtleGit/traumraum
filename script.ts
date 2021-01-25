"use strict";

// https://threejs.org/examples/webgl_materials_video_webcam.html

const MULTI_CAM: boolean = true;

const WIDTH: number = 800;
const HEIGHT: number = 600;
const STATUS_ELEMENT: HTMLElement = document.getElementById("status");
const DEBUG_INFO_ELEMENT: HTMLElement = document.getElementById("debug_info");

const videoElementA = <HTMLVideoElement>(
   document.getElementById("input_video_a")
);
const videoElementB = <HTMLVideoElement>(
   document.getElementById("input_video_b")
);
const canvasElement = <HTMLCanvasElement>(
   document.getElementById("output_canvas")
);
canvasElement.width = WIDTH;
canvasElement.height = HEIGHT;
const canvasCtx = canvasElement.getContext("2d");

function updateStatus(status: string, hidden: boolean = false): void {
   console.log(status);
   if (hidden) {
      STATUS_ELEMENT.style.display = "none";
   } else {
      STATUS_ELEMENT.innerHTML = status;
      STATUS_ELEMENT.style.display = "block";
   }
}

class HandsCamera {
   private cameraNumber: number;
   private drawColor: string;
   private lineSmoothingSteps: number;
   private videoElement: HTMLVideoElement;

   private multiHandsCamera: MultiHandsCamera;

   private cameraId: string;
   private cameraLabel: string;

   private hands;

   private handTracked: boolean = false;

   private initialized: boolean = false;

   private lastPoints: [number, number][] = [];
   private lastLinePoint: [number, number];

   constructor(
      videoElement: HTMLVideoElement,
      cameraNumber: number = 0,
      drawColor: string = "white",
      waitFor: HandsCamera = undefined,
      lineSmoothingSteps: number = 3
   ) {
      this.videoElement = videoElement;
      this.cameraNumber = cameraNumber;
      this.drawColor = drawColor;
      this.lineSmoothingSteps = lineSmoothingSteps;
      this.loadCameraId();
      this.waitForCameraId(this.initialize.bind(this, waitFor));
   }

   private loadCameraId(): void {
      var cameraDevices: MediaDeviceInfo[] = [];
      var cThis = this;
      navigator.mediaDevices.enumerateDevices().then(function (devices) {
         for (var i = 0; i < devices.length; i++) {
            var device = devices[i];
            if (device.kind === "videoinput") {
               cameraDevices.push(device);
            }
         }
         if (cameraDevices.length - 1 < cThis.cameraNumber) {
            updateStatus(
               "Could not find camera " +
                  cThis.getCameraName() +
                  ". Only " +
                  cameraDevices.length +
                  " camera(s) were found."
            );
         }
         cThis.cameraId = cameraDevices[cThis.cameraNumber].deviceId;
         cThis.cameraLabel = cameraDevices[cThis.cameraNumber].label;
         console.log(
            "Found " +
               cameraDevices.length +
               " camera device(s). Using camera " +
               cThis.getCameraName() +
               "."
         );
      });
   }

   private getCameraName(): string {
      if (this.cameraLabel === undefined || this.cameraLabel === "") {
         return "cam" + this.cameraNumber;
      }
      return this.cameraLabel;
   }

   public isInitialized(): boolean {
      return this.initialized;
   }

   private waitForCameraId(callback: TimerHandler): void {
      if (this.cameraId === undefined || this.cameraLabel === undefined) {
         setTimeout(this.waitForCameraId.bind(this, callback), 500);
      } else {
         setTimeout(callback, 0);
      }
   }

   private initialize(waitFor: HandsCamera): void {
      if (waitFor === undefined || waitFor.isInitialized()) {
         this.hands = new Hands({
            locateFile: (file) => {
               return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            },
         });
         this.hands.setOptions({
            maxNumHands: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
         });
         this.hands.onResults(this.onResults.bind(this));

         this.videoElement.autoplay = true;

         var cThis = this;

         navigator.mediaDevices
            .getUserMedia({
               video: {
                  width: WIDTH,
                  height: HEIGHT,
                  deviceId: { exact: cThis.cameraId },
               },
               audio: false,
            })
            .then(function (stream) {
               updateStatus(
                  "Loading hand observer of camera " +
                     cThis.getCameraName() +
                     " and video element " +
                     cThis.videoElement.id +
                     "..."
               );
               cThis.videoElement.srcObject = stream;
               cThis.initializeHandObserving();
            })
            .catch(function (error) {
               console.error("Failed to acquire camera feed: " + error);
               alert("Failed to acquire camera feed: " + error);
               throw error;
            });

         updateStatus(
            "Please allow access for camera " + this.getCameraName() + "."
         );
      } else {
         setTimeout(this.initialize.bind(this, waitFor), 500);
      }
   }

   private async initializeHandObserving() {
      await this.hands.send({ image: this.videoElement });
      this.initialized = true;
      updateStatus(
         "Loaded hand observer of camera " +
            this.getCameraName() +
            " and video element " +
            this.videoElement.id +
            "."
      );
      if (!this.handTracked) {
         updateStatus(
            "Please place your hand in front of your camera and move it to draw."
         );
      }
   }

   public startCapturing(): void {
      if (this.isInitialized()) {
         this.startCallFrameLoop();
      } else {
         setTimeout(this.startCapturing.bind(this), 500);
      }
   }

   private startCallFrameLoop(): void {
      this.callFrame(undefined);
      window.requestAnimationFrame(this.startCallFrameLoop.bind(this));
   }

   public async callFrame(callback) {
      await this.hands.send({ image: this.videoElement });
      if (callback !== undefined) {
         setTimeout(callback, 0);
      }
   }

   /*public async startTracking() {
      await this.hands.send({ image: this.videoElement });
      window.requestAnimationFrame(this.startTracking.bind(this));
   }*/

   private onResults(results) {
      if (results.multiHandLandmarks) {
         for (const landmarks of results.multiHandLandmarks) {
            var x: number =
               canvasElement.clientWidth -
               landmarks[8].x * canvasElement.clientWidth;
            var y: number = landmarks[8].y * canvasElement.clientHeight;

            if (this.lastPoints.length === this.lineSmoothingSteps) {
               var averagePoint: [number, number] = [0, 0];
               for (var i = 0; i < this.lastPoints.length; i++) {
                  averagePoint[0] += this.lastPoints[i][0];
                  averagePoint[1] += this.lastPoints[i][1];
               }
               averagePoint[0] /= this.lastPoints.length;
               averagePoint[1] /= this.lastPoints.length;

               if (
                  this.drawColor !== "none" &&
                  this.lastLinePoint !== undefined
               ) {
                  if (
                     this.multiHandsCamera === undefined ||
                     (this.multiHandsCamera.getCurrentDistanceToCamera() >
                        1000 &&
                        this.multiHandsCamera.getCurrentDistanceToCamera() <
                           1300)
                  ) {
                     canvasCtx.beginPath();
                     canvasCtx.lineCap = "round";
                     canvasCtx.moveTo(
                        this.lastLinePoint[0],
                        this.lastLinePoint[1]
                     );
                     canvasCtx.lineTo(averagePoint[0], averagePoint[1]);
                     canvasCtx.strokeStyle = this.drawColor;
                     canvasCtx.stroke();
                  }
               }
               if (!this.handTracked) {
                  this.handTracked = true;
                  updateStatus("Hand tracked.", true);
               }
               if (this.multiHandsCamera !== undefined) {
                  this.multiHandsCamera.setTrackingPoint(this, averagePoint);
               }
               this.lastLinePoint = averagePoint;
               this.lastPoints.shift();
            }
            this.lastPoints.push([x, y]);
         }
      } else {
         this.multiHandsCamera.resetCurrentDistanceToCamera();
      }
   }

   public setMultiHandsCamera(multiHandsCamera: MultiHandsCamera): void {
      this.multiHandsCamera = multiHandsCamera;
   }
}

class MultiHandsCamera {
   private handsCameras: HandsCamera[];
   private trackingPoints: [HandsCamera, [number, number]][] = [];
   private distanceToCamera: number;

   private processedFrames: number = 0;

   private drawColor: string;

   constructor(handsCameras: HandsCamera[], drawColor: string = "White") {
      this.handsCameras = handsCameras;
      this.drawColor = drawColor;
      this.initialize();
   }

   private initialize() {
      for (var i = 0; i < this.handsCameras.length; i++) {
         this.handsCameras[i].setMultiHandsCamera(this);
         this.trackingPoints.push([this.handsCameras[i], [0, 0]]);
         this.calledBackFrames.push(false);
      }
   }

   private updateDistanceToCamera(): void {
      var distanceToCamera: [number, number] = [0, 0];

      for (var i = 1; i < this.trackingPoints.length; i++) {
         distanceToCamera[0] += Math.abs(
            this.trackingPoints[0][1][0] - this.trackingPoints[i][1][0]
         );
         distanceToCamera[1] += Math.abs(
            this.trackingPoints[0][1][1] - this.trackingPoints[i][1][1]
         );
      }
      this.distanceToCamera =
         WIDTH + HEIGHT - distanceToCamera[0] + distanceToCamera[1];
   }

   public getProcessedFrames(): number {
      const tmp: number = this.processedFrames;
      this.processedFrames = 0;
      return tmp;
   }

   public resetCurrentDistanceToCamera(): void {
      this.distanceToCamera = undefined;
   }

   public getCurrentDistanceToCamera(): number {
      return this.distanceToCamera;
   }

   private allHandCamerasInitialized(): boolean {
      for (var i = 0; i < this.handsCameras.length; i++) {
         if (!this.handsCameras[i].isInitialized()) {
            return false;
         }
      }
      return true;
   }

   public startTracking(): void {
      if (this.allHandCamerasInitialized()) {
         this.callFrames();
      } else {
         setTimeout(this.startTracking.bind(this), 500);
      }
   }

   private callFrames(): void {
      for (var i = 0; i < this.handsCameras.length; i++) {
         setTimeout(
            this.handsCameras[i].callFrame.bind(
               this.handsCameras[i],
               this.frameCalledBack.bind(this, i)
            ),
            0
         );
      }
   }

   private allFramesCalledBack(): boolean {
      for (var i = 0; i < this.calledBackFrames.length; i++) {
         if (this.calledBackFrames[i] === false) {
            return false;
         }
      }
      return true;
   }

   private calledBackFrames: boolean[] = [];
   private lastDrawPoint: [number, number];
   public frameCalledBack(handsCameraId: number) {
      this.calledBackFrames[handsCameraId] = true;
      if (this.allFramesCalledBack()) {
         this.updateDistanceToCamera();
         if (
            this.drawColor !== "none" &&
            this.distanceToCamera > 1000 &&
            this.distanceToCamera < 1300
         ) {
            var x: number = 0;
            var y: number = 0;
            for (var i = 0; i < this.trackingPoints.length; i++) {
               x += this.trackingPoints[i][1][0];
               y += this.trackingPoints[i][1][1];
            }
            x /= this.trackingPoints.length;
            y /= this.trackingPoints.length;

            if (this.lastDrawPoint !== undefined) {
               canvasCtx.beginPath();
               canvasCtx.lineCap = "round";
               canvasCtx.moveTo(this.lastDrawPoint[0], this.lastDrawPoint[1]);
               canvasCtx.lineTo(x, y);
               canvasCtx.strokeStyle = this.drawColor;
               canvasCtx.stroke();
            }

            this.lastDrawPoint = [x, y];
         }

         for (var i = 0; i < this.calledBackFrames.length; i++) {
            this.calledBackFrames[i] = false;
         }
         this.callFrames();
         this.processedFrames++;
      }
   }

   public setTrackingPoint(
      handsCamera: HandsCamera,
      trackingPoint: [number, number]
   ): void {
      for (var i = 0; i < this.trackingPoints.length; i++) {
         if (this.trackingPoints[i][0] === handsCamera) {
            this.trackingPoints[i][1] = trackingPoint;
         }
      }
   }
}

if (MULTI_CAM) {
   const handsCameraA: HandsCamera = new HandsCamera(videoElementA, 0, "none");
   const handsCameraB: HandsCamera = new HandsCamera(
      videoElementB,
      1,
      "white",
      handsCameraA
   );

   const multiHandsCamera: MultiHandsCamera = new MultiHandsCamera(
      [handsCameraA, handsCameraB],
      "none"
   );

   multiHandsCamera.startTracking();

   function updateDebugInfo(): void {
      DEBUG_INFO_ELEMENT.innerHTML =
         "FPS: " +
         Math.round(multiHandsCamera.getProcessedFrames()) +
         "</br>d: " +
         Math.round(multiHandsCamera.getCurrentDistanceToCamera());
   }
   setInterval(updateDebugInfo, 1000);
} else {
   const handsCamera: HandsCamera = new HandsCamera(videoElementA, 0);
   handsCamera.startCapturing();
}
