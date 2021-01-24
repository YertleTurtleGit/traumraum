"use strict";

const WIDTH = 1280;
const HEIGHT = 720;
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

var lastPoints: [number, number][] = [];
var lastLinePoint: [number, number];

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
      this.initialize(waitFor);
   }

   private getCameraId(): string {
      if (this.cameraId === undefined) {
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
            return cThis.cameraId;
         });
      } else {
         return this.cameraId;
      }
   }

   private getCameraName(): string {
      this.getCameraId();
      if (this.cameraLabel === undefined || this.cameraLabel === "") {
         return "cam" + this.cameraNumber;
      }
      return this.cameraLabel;
   }

   public isInitialized(): boolean {
      return this.initialized;
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
                  deviceId: { exact: cThis.getCameraId() },
               },
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

         this.getCameraId();
         updateStatus(
            "Please allow access for camera " + this.getCameraName() + "."
         );
      } else {
         console.log("waiting...");
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

   public async callFrame(callback) {
      await this.hands.send({ image: this.videoElement });
      setTimeout(callback, 0);
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

            if (lastPoints.length === this.lineSmoothingSteps) {
               var averagePoint: [number, number] = [0, 0];
               for (var i = 0; i < lastPoints.length; i++) {
                  averagePoint[0] += lastPoints[i][0];
                  averagePoint[1] += lastPoints[i][1];
               }
               averagePoint[0] /= lastPoints.length;
               averagePoint[1] /= lastPoints.length;

               if (lastLinePoint !== undefined) {
                  canvasCtx.beginPath();
                  canvasCtx.lineCap = "round";
                  canvasCtx.moveTo(lastLinePoint[0], lastLinePoint[1]);
                  canvasCtx.lineTo(averagePoint[0], averagePoint[1]);
                  canvasCtx.strokeStyle = this.drawColor;
                  canvasCtx.stroke();
               }
               if (!this.handTracked) {
                  this.handTracked = true;
                  updateStatus("Hand tracked.", true);
               }
               if (this.multiHandsCamera !== undefined) {
                  this.multiHandsCamera.setTrackingPoint(this, averagePoint);
               }
               lastLinePoint = averagePoint;
               lastPoints.shift();
            }
            lastPoints.push([x, y]);
         }
      }
   }

   public setMultiHandsCamera(multiHandsCamera: MultiHandsCamera): void {
      this.multiHandsCamera = multiHandsCamera;
   }
}

class MultiHandsCamera {
   private isWaitingForResult: boolean[] = [];

   private handsCameras: HandsCamera[];
   private trackingPoints: [HandsCamera, [number, number]][] = [];
   private distanceToCamera: number;

   private currentTFPS: number = 0;
   private currentFPS: number = 0;
   private lastTrackingFrameUpdate: number = performance.now();
   private lastFrameUpdate: number = performance.now();

   constructor(handsCameras: HandsCamera[]) {
      this.handsCameras = handsCameras;
      this.initialize();
   }

   private initialize() {
      for (var i = 0; i < this.handsCameras.length; i++) {
         this.handsCameras[i].setMultiHandsCamera(this);
         this.trackingPoints.push([this.handsCameras[i], [0, 0]]);
         this.isWaitingForResult.push(true);
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
      this.distanceToCamera = distanceToCamera[0] + distanceToCamera[1];
   }

   public isWaitingForResultOf(handsCamera: HandsCamera): boolean {
      for (var i = 0; i < this.handsCameras.length; i++) {
         if (this.handsCameras[i] === handsCamera) {
            return this.isWaitingForResult[i];
         }
      }
   }

   public getCurrentTFPS(): number {
      return this.currentTFPS;
   }

   public getCurrentFPS(): number {
      return this.currentFPS;
   }

   public getCurrentDistanceToCamera(): number {
      return this.distanceToCamera;
   }

   private updateTFPS(): void {
      this.currentTFPS =
         1 / ((performance.now() - this.lastTrackingFrameUpdate) / 1000);
      this.lastTrackingFrameUpdate = performance.now();
   }

   private updateFPS(): void {
      this.currentFPS = 1 / ((performance.now() - this.lastFrameUpdate) / 1000);
      this.lastFrameUpdate = performance.now();
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
         console.log("waiting2...");
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
   public frameCalledBack(handsCameraId: number) {
      this.calledBackFrames[handsCameraId] = true;
      if (this.allFramesCalledBack()) {
         for (var i = 0; i < this.calledBackFrames.length; i++) {
            this.calledBackFrames[i] = false;
         }
         this.callFrames();
         this.updateFPS();
      }
   }

   // TODO: Implement timing
   private firstTrackingPointUpdateInFrame: number;
   public setTrackingPoint(
      handsCamera: HandsCamera,
      trackingPoint: [number, number]
   ): void {
      var cameraIndex: number;

      for (var i = 0; i < this.trackingPoints.length; i++) {
         if (this.trackingPoints[i][0] === handsCamera) {
            this.trackingPoints[i][1] = trackingPoint;
            cameraIndex = i;
         }
      }
      this.isWaitingForResult[cameraIndex] = false;

      var updateDistance: boolean = true;
      for (var i = 0; i < this.isWaitingForResult.length; i++) {
         if (this.isWaitingForResult[i]) {
            updateDistance = false;
            break;
         }
      }
      if (updateDistance) {
         for (var i = 0; i < this.isWaitingForResult.length; i++) {
            this.isWaitingForResult[i] = true;
         }
         this.updateDistanceToCamera();
         this.updateTFPS();
      }
   }
}

const handsCameraA: HandsCamera = new HandsCamera(videoElementA, 0, "red");
const handsCameraB: HandsCamera = new HandsCamera(
   videoElementB,
   0,
   "green",
   handsCameraA
);

const multiHandsCamera: MultiHandsCamera = new MultiHandsCamera([
   handsCameraA,
   handsCameraB,
]);

multiHandsCamera.startTracking();

function updateDebugInfo(): void {
   DEBUG_INFO_ELEMENT.innerHTML =
      "FPS: " +
      Math.round(multiHandsCamera.getCurrentFPS()) +
      "</br>TFPS: " +
      Math.round(multiHandsCamera.getCurrentTFPS()) +
      "</br>d: " +
      Math.round(multiHandsCamera.getCurrentDistanceToCamera());
}
setInterval(updateDebugInfo, 500);
