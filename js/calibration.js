"use strict";
class Calibration {
    constructor(camera) {
        this.maskThreshold = 0.2;
        this.camera = camera;
    }
    getCalibrationPictures() { }
    calculateCalibrationPixelArray() {
        const calibrationPictures = this.getCalibrationPictures();
        const shader = new Shader();
        shader.bind();
        const glslDarkImage = GlslImage.load(calibrationPictures.dark);
        const glslBrightImage = GlslImage.load(calibrationPictures.bright);
        const glslCalibrationImage = glslBrightImage.subtractVector4(glslDarkImage);
        const calibrationPixelArray = GlslRendering.render(glslCalibrationImage).getPixelArray();
        shader.purge();
        this.width = calibrationPictures.bright.width;
        this.height = calibrationPictures.bright.height;
    }
    getCornerCoordinates() {
        this.calculateCalibrationPixelArray();
        this.isProjectionInImage();
        let highestPixelInMask;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.isMaskedOut({ x: x, y: y })) {
                    highestPixelInMask = { x: x, y: y };
                    break;
                }
            }
        }
        let lowestPixelInMask;
        for (let y = this.height - 1; y > 0; y--) {
            for (let x = 0; x < this.width; x++) {
                if (!this.isMaskedOut({ x: x, y: y })) {
                    lowestPixelInMask = { x: x, y: y };
                    break;
                }
            }
        }
        let leftestPixelInMask;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (!this.isMaskedOut({ x: x, y: y })) {
                    leftestPixelInMask = { x: x, y: y };
                    break;
                }
            }
        }
        let rightestPixelInMask;
        for (let x = 0; x < this.width; x++) {
            for (let y = this.height - 1; y > 0; y--) {
                if (!this.isMaskedOut({ x: x, y: y })) {
                    rightestPixelInMask = { x: x, y: y };
                    break;
                }
            }
        }
    }
    isMaskedOut(pixel) {
        return this.getLuminance(pixel) < this.maskThreshold;
    }
    getLuminance(pixel) {
        const index = pixel.x + pixel.y * this.width;
        return ((this.calibrationPixelArray[index + 0 /* RED */] +
            this.calibrationPixelArray[index + 1 /* GREEN */] +
            this.calibrationPixelArray[index + 2 /* BLUE */]) /
            (255 * 3));
    }
    isProjectionInImage() {
        const leftX = 0;
        const rightX = this.width;
        const topY = 0;
        const bottomY = this.height;
        for (let y = 0; y < this.height; y++) {
            if (!this.isMaskedOut({ x: leftX, y: y })) {
                updateStatus("Camera " +
                    this.camera.getName() +
                    " is tilted too far to the right.");
                return false;
            }
            if (!this.isMaskedOut({ x: rightX, y: y })) {
                updateStatus("Camera " +
                    this.camera.getName() +
                    " is tilted too far to the left.");
                return false;
            }
        }
        for (let x = 0; x < this.width; x++) {
            if (!this.isMaskedOut({ x: x, y: topY })) {
                updateStatus("Camera " +
                    this.camera.getName() +
                    " is tilted too far to the bottom.");
                return false;
            }
            if (!this.isMaskedOut({ x: x, y: bottomY })) {
                updateStatus("Camera " +
                    this.camera.getName() +
                    " is tilted too far to the top.");
                return false;
            }
        }
        return true;
    }
    getProjectionVectors() {
        const cornerCoordinates = this.getCornerCoordinates();
    }
}
