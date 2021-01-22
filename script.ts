"use strict";

const WIDTH = 1280;
const HEIGHT = 720;

const videoElementA = <HTMLVideoElement>(
   document.getElementById("input_video_a")
);
const videoElementB = <HTMLVideoElement>(
   document.getElementById("input_video_b")
);
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");

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
         canvasCtx.fillRect(
            canvasElement.clientWidth -
               landmarks[8].x * canvasElement.clientWidth,
            landmarks[8].y * canvasElement.clientHeight,
            5,
            5
         );
      }
   }
}

class HandsCamera {
   private videoElement: HTMLVideoElement;
   private cameraNumber: number;
   private cameraId: string;

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
            cThis.cameraId = cameraDevices[cThis.cameraNumber].deviceId;
            return cThis.cameraId;
         });
      } else {
         return this.cameraId;
      }
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

      var cThis = this;

      navigator.mediaDevices
         .getUserMedia({
            video: {
               width: WIDTH,
               height: HEIGHT,
               deviceId: { exact: cThis.getCameraId() },
            },
            audio: false,
         })
         .then(function () {
            cThis.onFrame();
         })
         .catch(function (error) {
            console.error("Failed to acquire camera feed: " + error);
            alert("Failed to acquire camera feed: " + error);
            throw error;
         });
   }

   async onFrame() {
      await this.hands.send({ image: this.videoElement });
      console.log("ON FRAME!");
      window.requestAnimationFrame(this.onFrame.bind(this));
   }
}

const cameraA: HandsCamera = new HandsCamera(0, videoElementA);

/*const cameraA = new Camera(videoElementA, {
   onFrame: async () => {
      await hands.send({ image: videoElementA });
   },
   width: 1280,
   height: 720,
});
cameraA.start();*/
