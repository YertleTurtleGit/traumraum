"use strict";

class Webcam {
   private streaming: boolean;
   private width: number;
   private height: number;
   private onReadyCallback: TimerHandler;

   private useVideo: boolean;
   private useAudio: boolean;
   private canvas: HTMLCanvasElement;
   private context: CanvasRenderingContext2D;
   private videoElem: HTMLVideoElement;
   private stream: MediaStream;

   constructor(resolution: number[], onReadyCallback: TimerHandler) {
      this.streaming = false;
      this.width = resolution[0];
      this.height = resolution[1];
      this.onReadyCallback = onReadyCallback;
   }

   getName() {
      throw new Error("Method not implemented.");
   }

   async startStreaming(useVideo = true, useAudio = false) {
      this.useVideo = useVideo;
      this.useAudio = useAudio;

      this.canvas = document.createElement("canvas");
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.context = this.canvas.getContext("2d");

      this.videoElem = document.createElement("video");
      /*this.videoElem.width = this.width;
      this.videoElem.height = this.height;
      this.videoElem.style.width = "100%";
      this.videoElem.style.height = "100%";
      this.videoElem.style.position = "absolute";
      this.videoElem.style.zIndex = 999;
      this.videoElem.style.top = 0;
      this.videoElem.style.left = 0;
      document.body.appendChild(this.videoElem);*/

      let constraints = { video: this.useVideo, audio: this.useAudio };
      try {
         this.stream = await navigator.mediaDevices.getUserMedia(constraints);
         this.videoElem.srcObject = this.stream;
         this.videoElem.play();
         this.streaming = true;
         setTimeout(this.onReadyCallback, 1000);
      } catch (error) {
         console.error("An error occurred: " + error);
         this.streaming = false;
      }
   }

   isReady() {
      if (this.videoElem) {
         return this.videoElem.duration == Infinity;
      }
      return false;
   }

   takePicture() {
      this.context.save();
      this.context.scale(-1, 1);
      this.context.drawImage(
         this.videoElem,
         0,
         0,
         this.width * -1,
         this.height
      );
      this.context.restore();
      return this.canvas.toDataURL("image/png");
   }

   purgeDisplay() {
      this.canvas.remove();
      this.videoElem.remove();
   }

   stop() {
      if (this.streaming) {
         this.stream.getTracks().forEach(function (track) {
            track.stop();
         });
      }
      this.stream = null;
      this.streaming = false;
   }

   purge() {
      this.stop();
      this.canvas.remove();
      this.videoElem.remove();
   }
}
