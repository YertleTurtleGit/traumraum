"use strict";
const WIDTH = 1280;
const HEIGHT = 720;
const STATUS_ELEMENT = document.getElementById("status");
const DEBUG_INFO_ELEMENT = document.getElementById("debug_info");
const videoElementA = (document.getElementById("input_video_a"));
const videoElementB = (document.getElementById("input_video_b"));
const canvasElement = (document.getElementById("output_canvas"));
const canvasCtx = canvasElement.getContext("2d");
function updateStatus(status, hidden = false) {
    console.log(status);
    if (hidden) {
        STATUS_ELEMENT.style.display = "none";
    }
    else {
        STATUS_ELEMENT.innerHTML = status;
        STATUS_ELEMENT.style.display = "block";
    }
}
var lastPoints = [];
var lastLinePoint;
class HandsCamera {
    constructor(videoElement, cameraNumber = 0, drawColor = "white", waitFor = undefined, lineSmoothingSteps = 3) {
        this.handTracked = false;
        this.initialized = false;
        this.videoElement = videoElement;
        this.cameraNumber = cameraNumber;
        this.drawColor = drawColor;
        this.lineSmoothingSteps = lineSmoothingSteps;
        this.initialize(waitFor);
    }
    getCameraId() {
        if (this.cameraId === undefined) {
            var cameraDevices = [];
            var cThis = this;
            navigator.mediaDevices.enumerateDevices().then(function (devices) {
                for (var i = 0; i < devices.length; i++) {
                    var device = devices[i];
                    if (device.kind === "videoinput") {
                        cameraDevices.push(device);
                    }
                }
                if (cameraDevices.length - 1 < cThis.cameraNumber) {
                    updateStatus("Could not find camera " +
                        cThis.getCameraName() +
                        ". Only " +
                        cameraDevices.length +
                        " camera(s) were found.");
                }
                cThis.cameraId = cameraDevices[cThis.cameraNumber].deviceId;
                cThis.cameraLabel = cameraDevices[cThis.cameraNumber].label;
                return cThis.cameraId;
            });
        }
        else {
            return this.cameraId;
        }
    }
    getCameraName() {
        this.getCameraId();
        if (this.cameraLabel === undefined || this.cameraLabel === "") {
            return "cam" + this.cameraNumber;
        }
        return this.cameraLabel;
    }
    isInitialized() {
        return this.initialized;
    }
    initialize(waitFor) {
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
                updateStatus("Loading hand observer of camera " +
                    cThis.getCameraName() +
                    " and video element " +
                    cThis.videoElement.id +
                    "...");
                cThis.videoElement.srcObject = stream;
                cThis.initializeHandObserving();
            })
                .catch(function (error) {
                console.error("Failed to acquire camera feed: " + error);
                alert("Failed to acquire camera feed: " + error);
                throw error;
            });
            this.getCameraId();
            updateStatus("Please allow access for camera " + this.getCameraName() + ".");
        }
        else {
            console.log("waiting...");
            setTimeout(this.initialize.bind(this, waitFor), 500);
        }
    }
    async initializeHandObserving() {
        await this.hands.send({ image: this.videoElement });
        this.initialized = true;
        updateStatus("Loaded hand observer of camera " +
            this.getCameraName() +
            " and video element " +
            this.videoElement.id +
            ".");
        if (!this.handTracked) {
            updateStatus("Please place your hand in front of your camera and move it to draw.");
        }
    }
    async callFrame(callback) {
        await this.hands.send({ image: this.videoElement });
        setTimeout(callback, 0);
    }
    /*public async startTracking() {
       await this.hands.send({ image: this.videoElement });
       window.requestAnimationFrame(this.startTracking.bind(this));
    }*/
    onResults(results) {
        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                var x = canvasElement.clientWidth -
                    landmarks[8].x * canvasElement.clientWidth;
                var y = landmarks[8].y * canvasElement.clientHeight;
                if (lastPoints.length === this.lineSmoothingSteps) {
                    var averagePoint = [0, 0];
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
    setMultiHandsCamera(multiHandsCamera) {
        this.multiHandsCamera = multiHandsCamera;
    }
}
class MultiHandsCamera {
    constructor(handsCameras) {
        this.isWaitingForResult = [];
        this.trackingPoints = [];
        this.currentTFPS = 0;
        this.currentFPS = 0;
        this.lastTrackingFrameUpdate = performance.now();
        this.lastFrameUpdate = performance.now();
        this.calledBackFrames = [];
        this.handsCameras = handsCameras;
        this.initialize();
    }
    initialize() {
        for (var i = 0; i < this.handsCameras.length; i++) {
            this.handsCameras[i].setMultiHandsCamera(this);
            this.trackingPoints.push([this.handsCameras[i], [0, 0]]);
            this.isWaitingForResult.push(true);
            this.calledBackFrames.push(false);
        }
    }
    updateDistanceToCamera() {
        var distanceToCamera = [0, 0];
        for (var i = 1; i < this.trackingPoints.length; i++) {
            distanceToCamera[0] += Math.abs(this.trackingPoints[0][1][0] - this.trackingPoints[i][1][0]);
            distanceToCamera[1] += Math.abs(this.trackingPoints[0][1][1] - this.trackingPoints[i][1][1]);
        }
        this.distanceToCamera = distanceToCamera[0] + distanceToCamera[1];
    }
    isWaitingForResultOf(handsCamera) {
        for (var i = 0; i < this.handsCameras.length; i++) {
            if (this.handsCameras[i] === handsCamera) {
                return this.isWaitingForResult[i];
            }
        }
    }
    getCurrentTFPS() {
        return this.currentTFPS;
    }
    getCurrentFPS() {
        return this.currentFPS;
    }
    getCurrentDistanceToCamera() {
        return this.distanceToCamera;
    }
    updateTFPS() {
        this.currentTFPS =
            1 / ((performance.now() - this.lastTrackingFrameUpdate) / 1000);
        this.lastTrackingFrameUpdate = performance.now();
    }
    updateFPS() {
        this.currentFPS = 1 / ((performance.now() - this.lastFrameUpdate) / 1000);
        this.lastFrameUpdate = performance.now();
    }
    allHandCamerasInitialized() {
        for (var i = 0; i < this.handsCameras.length; i++) {
            if (!this.handsCameras[i].isInitialized()) {
                return false;
            }
        }
        return true;
    }
    startTracking() {
        if (this.allHandCamerasInitialized()) {
            this.callFrames();
        }
        else {
            console.log("waiting2...");
            setTimeout(this.startTracking.bind(this), 500);
        }
    }
    callFrames() {
        for (var i = 0; i < this.handsCameras.length; i++) {
            setTimeout(this.handsCameras[i].callFrame.bind(this.handsCameras[i], this.frameCalledBack.bind(this, i)), 0);
        }
    }
    allFramesCalledBack() {
        for (var i = 0; i < this.calledBackFrames.length; i++) {
            if (this.calledBackFrames[i] === false) {
                return false;
            }
        }
        return true;
    }
    frameCalledBack(handsCameraId) {
        this.calledBackFrames[handsCameraId] = true;
        if (this.allFramesCalledBack()) {
            for (var i = 0; i < this.calledBackFrames.length; i++) {
                this.calledBackFrames[i] = false;
            }
            this.callFrames();
            this.updateFPS();
        }
    }
    setTrackingPoint(handsCamera, trackingPoint) {
        var cameraIndex;
        for (var i = 0; i < this.trackingPoints.length; i++) {
            if (this.trackingPoints[i][0] === handsCamera) {
                this.trackingPoints[i][1] = trackingPoint;
                cameraIndex = i;
            }
        }
        this.isWaitingForResult[cameraIndex] = false;
        var updateDistance = true;
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
const handsCameraA = new HandsCamera(videoElementA, 0, "red");
const handsCameraB = new HandsCamera(videoElementB, 0, "green", handsCameraA);
const multiHandsCamera = new MultiHandsCamera([
    handsCameraA,
    handsCameraB,
]);
multiHandsCamera.startTracking();
function updateDebugInfo() {
    DEBUG_INFO_ELEMENT.innerHTML =
        "FPS: " +
            Math.round(multiHandsCamera.getCurrentFPS()) +
            "</br>TFPS: " +
            Math.round(multiHandsCamera.getCurrentTFPS()) +
            "</br>d: " +
            Math.round(multiHandsCamera.getCurrentDistanceToCamera());
}
setInterval(updateDebugInfo, 500);
