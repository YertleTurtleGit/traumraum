"use strict";

const WIDTH = 1280;
const HEIGHT = 720;
const STATUS_ELEMENT: HTMLElement = document.getElementById("status");

const videoElementA = <HTMLVideoElement>(
   document.getElementById("input_video_a")
);
const videoElementB = <HTMLVideoElement>(
   document.getElementById("input_video_b")
);
const canvasElement = document.getElementById("output_canvas");
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

function onResults(results) {
   if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
         /*drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5,
         });*/
         /*drawLandmarks(canvasCtx, [landmarks[8]], {
            color: "#FF0000",
            lineWidth: 2,
         });*/

         /*canvasCtx.beginPath();
         canvasCtx.arc(
            canvasElement.clientWidth -
               landmarks[8].x * canvasElement.clientWidth,
            landmarks[8].y * canvasElement.clientHeight,
            5,
            0,
            2 * Math.PI,
            false
         );
         canvasCtx.fillStyle = "white";
         canvasCtx.fill();*/

         var x: number =
            canvasElement.clientWidth -
            landmarks[8].x * canvasElement.clientWidth;
         var y: number = landmarks[8].y * canvasElement.clientHeight;
         if (lastPoints.length === 5) {
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
               canvasCtx.strokeStyle = "white";
               canvasCtx.stroke();
            }
            lastLinePoint = averagePoint;
            lastPoints.shift();
         }
         lastPoints.push([x, y]);
      }
   }
}

class HandsCamera {
   private videoElement: HTMLVideoElement;
   private cameraNumber: number;
   private cameraId: string;
   private cameraLabel: string;

   private hands;

   constructor(cameraNumber: number = 0, videoElement: HTMLVideoElement) {
      this.cameraNumber = cameraNumber;
      this.videoElement = videoElement;
      this.initialize();
   }

   getCameraId(): string {
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

   getCameraName(): string {
      this.getCameraId();
      if (this.cameraLabel === undefined || this.cameraLabel === "") {
         return "cam" + this.cameraNumber;
      }
      return this.cameraLabel;
   }

   initialize(): void {
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
      this.hands.onResults(onResults);

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
            cThis.startHandObserving();
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
   }

   async startHandObserving() {
      await this.hands.send({ image: this.videoElement });
      updateStatus(
         "Loaded hand observer of camera " +
            this.getCameraName() +
            " and video element " +
            this.videoElement.id +
            ".",
         true
      );
      this.onFrame();
   }

   async onFrame() {
      await this.hands.send({ image: this.videoElement });
      window.requestAnimationFrame(this.onFrame.bind(this));
   }
}

const cameraA: HandsCamera = new HandsCamera(0, videoElementA);
//const cameraB: HandsCamera = new HandsCamera(1, videoElementB);

/*const cameraA = new Camera(videoElementA, {
   onFrame: async () => {
      await hands.send({ image: videoElementA });
   },
   width: WIDTH,
   height: HEIGHT,
});
cameraA.start();*/
