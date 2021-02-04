"use strict";

class Calibration {
   private camera: Webcam;
   private calibrationVectors: { x: number; y: number }[];

   private readonly maskThreshold: number = 0.2;

   private width: number;
   private height: number;

   private calibrationPixelArray: Uint8Array;

   constructor(camera: Webcam) {
      this.camera = camera;
   }

   private getCalibrationPictures(): {
      bright: HTMLImageElement;
      dark: HTMLImageElement;
   } {}

   private calculateCalibrationPixelArray(): Uint8Array {
      const calibrationPictures: {
         bright: HTMLImageElement;
         dark: HTMLImageElement;
      } = this.getCalibrationPictures();

      const shader: Shader = new Shader();
      shader.bind();

      const glslDarkImage: GlslVector4 = GlslImage.load(
         calibrationPictures.dark
      );
      const glslBrightImage: GlslVector4 = GlslImage.load(
         calibrationPictures.bright
      );

      const glslCalibrationImage: GlslVector4 = glslBrightImage.subtractVector4(
         glslDarkImage
      );

      const calibrationPixelArray: Uint8Array = GlslRendering.render(
         glslCalibrationImage
      ).getPixelArray();

      shader.purge();

      this.width = calibrationPictures.bright.width;
      this.height = calibrationPictures.bright.height;
   }

   private getCornerCoordinates(): { x: number; y: number }[] {
      this.calculateCalibrationPixelArray();
      this.isProjectionInImage();

      let highestPixelInMask: { x: number; y: number };
      for (let y = 0; y < this.height; y++) {
         for (let x = 0; x < this.width; x++) {
            if (!this.isMaskedOut({ x: x, y: y })) {
               highestPixelInMask = { x: x, y: y };
               break;
            }
         }
      }

      let lowestPixelInMask: { x: number; y: number };
      for (let y = this.height - 1; y > 0; y--) {
         for (let x = 0; x < this.width; x++) {
            if (!this.isMaskedOut({ x: x, y: y })) {
               lowestPixelInMask = { x: x, y: y };
               break;
            }
         }
      }

      let leftestPixelInMask: { x: number; y: number };
      for (let x = 0; x < this.width; x++) {
         for (let y = 0; y < this.height; y++) {
            if (!this.isMaskedOut({ x: x, y: y })) {
               leftestPixelInMask = { x: x, y: y };
               break;
            }
         }
      }

      let rightestPixelInMask: { x: number; y: number };
      for (let x = 0; x < this.width; x++) {
         for (let y = this.height - 1; y > 0; y--) {
            if (!this.isMaskedOut({ x: x, y: y })) {
               rightestPixelInMask = { x: x, y: y };
               break;
            }
         }
      }

      
   }

   private isMaskedOut(pixel: { x: number; y: number }): boolean {
      return this.getLuminance(pixel) < this.maskThreshold;
   }

   private getLuminance(pixel: { x: number; y: number }): number {
      const index: number = pixel.x + pixel.y * this.width;
      return (
         (this.calibrationPixelArray[index + GLSL_CHANNEL.RED] +
            this.calibrationPixelArray[index + GLSL_CHANNEL.GREEN] +
            this.calibrationPixelArray[index + GLSL_CHANNEL.BLUE]) /
         (255 * 3)
      );
   }

   private isProjectionInImage(): boolean {
      const leftX: number = 0;
      const rightX: number = this.width;
      const topY: number = 0;
      const bottomY: number = this.height;

      for (let y = 0; y < this.height; y++) {
         if (!this.isMaskedOut({ x: leftX, y: y })) {
            updateStatus(
               "Camera " +
                  this.camera.getName() +
                  " is tilted too far to the right."
            );
            return false;
         }
         if (!this.isMaskedOut({ x: rightX, y: y })) {
            updateStatus(
               "Camera " +
                  this.camera.getName() +
                  " is tilted too far to the left."
            );
            return false;
         }
      }

      for (let x = 0; x < this.width; x++) {
         if (!this.isMaskedOut({ x: x, y: topY })) {
            updateStatus(
               "Camera " +
                  this.camera.getName() +
                  " is tilted too far to the bottom."
            );
            return false;
         }
         if (!this.isMaskedOut({ x: x, y: bottomY })) {
            updateStatus(
               "Camera " +
                  this.camera.getName() +
                  " is tilted too far to the top."
            );
            return false;
         }
      }
      return true;
   }

   public getProjectionVectors(): { x: number; y: number }[] {
      const cornerCoordinates: {
         x: number;
         y: number;
      }[] = this.getCornerCoordinates();
   }
}
