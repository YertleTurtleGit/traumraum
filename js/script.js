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
    constructor(videoElement, cameraNumber = 0, drawColor = "white", lineSmoothingSteps = 3) {
        this.handTracked = false;
        this.videoElement = videoElement;
        this.cameraNumber = cameraNumber;
        this.drawColor = drawColor;
        this.lineSmoothingSteps = lineSmoothingSteps;
        this.initialize();
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
    initialize() {
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
            cThis.startHandObserving();
        })
            .catch(function (error) {
            console.error("Failed to acquire camera feed: " + error);
            alert("Failed to acquire camera feed: " + error);
            throw error;
        });
        this.getCameraId();
        updateStatus("Please allow access for camera " + this.getCameraName() + ".");
    }
    async startHandObserving() {
        await this.hands.send({ image: this.videoElement });
        updateStatus("Loaded hand observer of camera " +
            this.getCameraName() +
            " and video element " +
            this.videoElement.id +
            ".");
        if (!this.handTracked) {
            updateStatus("Please place your hand in front of your camera and move it to draw.");
        }
        this.onFrame();
    }
    async onFrame() {
        await this.hands.send({ image: this.videoElement });
        window.requestAnimationFrame(this.onFrame.bind(this));
    }
    onResults(results) {
        if (this.multiHandsCamera === undefined ||
            this.multiHandsCamera.isWaitingForResultOf(this)) {
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
    }
    setMultiHandsCamera(multiHandsCamera) {
        this.multiHandsCamera = multiHandsCamera;
    }
}
class MultiHandsCamera {
    constructor(handsCameras) {
        this.isWaitingForResult = [];
        this.trackingPoints = [];
        this.currentFPS = 0;
        this.lastFrameUpdate = performance.now();
        this.handsCameras = handsCameras;
        this.initialize();
    }
    initialize() {
        for (var i = 0; i < this.handsCameras.length; i++) {
            this.handsCameras[i].setMultiHandsCamera(this);
            this.trackingPoints.push([this.handsCameras[i], [0, 0]]);
            this.isWaitingForResult.push(true);
        }
    }
    updateDistanceToCamera() {
        var distanceToCamera = [
            this.trackingPoints[0][1][0],
            this.trackingPoints[0][1][1],
        ];
        for (var i = 1; i < this.trackingPoints.length; i++) {
            distanceToCamera[0] -= this.trackingPoints[i][1][0];
            distanceToCamera[1] -= this.trackingPoints[i][1][1];
        }
        this.distanceToCamera = Math.abs((Math.abs(distanceToCamera[0]) + Math.abs(distanceToCamera[1])) * -1);
        console.log(this.distanceToCamera);
    }
    isWaitingForResultOf(handsCamera) {
        for (var i = 0; i < this.handsCameras.length; i++) {
            if (this.handsCameras[i] === handsCamera) {
                return this.isWaitingForResult[i];
            }
        }
    }
    getCurrentFPS() {
        return this.currentFPS;
    }
    updateFPS() {
        this.currentFPS = 1 / ((performance.now() - this.lastFrameUpdate) / 1000);
        this.lastFrameUpdate = performance.now();
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
            this.updateFPS();
        }
    }
}
const handsCameraA = new HandsCamera(videoElementA, 0, "red");
const handsCameraB = new HandsCamera(videoElementB, 0, "green");
const multiHandsCamera = new MultiHandsCamera([
    handsCameraA,
    handsCameraB,
]);
function updateDebugInfo() {
    DEBUG_INFO_ELEMENT.innerHTML =
        "FPS: " + Math.round(multiHandsCamera.getCurrentFPS());
}
setInterval(updateDebugInfo, 500);
