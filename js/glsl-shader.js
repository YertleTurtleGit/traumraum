"use strict";
/*
The float precision used on the gpu. Set to medium when facing errors.
*/
const FLOAT_PRECISION = "highp" /* HIGH */;
const LUMINANCE_CHANNEL_QUANTIFIER = [
    1 / 3,
    1 / 3,
    1 / 3,
];
var SYMBOL;
(function (SYMBOL) {
    SYMBOL["ADD"] = " + ";
    SYMBOL["SUBTRACT"] = " - ";
    SYMBOL["MULTIPLY"] = " * ";
    SYMBOL["DIVIDE"] = " / ";
})(SYMBOL || (SYMBOL = {}));
var METHOD;
(function (METHOD) {
    METHOD["MAXIMUM"] = "max";
    METHOD["MINIMUM"] = "min";
    METHOD["INVERSE"] = "inverse";
    METHOD["NORMALIZE"] = "normalize";
    METHOD["LENGTH"] = "length";
    METHOD["SINE"] = "sin";
    METHOD["COSINE"] = "cos";
    METHOD["RADIANS"] = "radians";
})(METHOD || (METHOD = {}));
var CUSTOM;
(function (CUSTOM) {
    CUSTOM["LUMINANCE"] = "luminance";
    CUSTOM["CHANNEL"] = "channel";
    CUSTOM["VEC3_TO_VEC4"] = "vec3_to_vec4";
})(CUSTOM || (CUSTOM = {}));
class GLSL_OPERATORS {
    constructor() { }
}
GLSL_OPERATORS.ADD = {
    NAME: SYMBOL.ADD,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.SUBTRACT = {
    NAME: SYMBOL.SUBTRACT,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.MULTIPLY = {
    NAME: SYMBOL.MULTIPLY,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.DIVIDE = {
    NAME: SYMBOL.DIVIDE,
    TYPE: SYMBOL,
};
GLSL_OPERATORS.MAXIMUM = {
    NAME: METHOD.MAXIMUM,
    TYPE: METHOD,
};
GLSL_OPERATORS.MINIMUM = {
    NAME: METHOD.MINIMUM,
    TYPE: METHOD,
};
GLSL_OPERATORS.INVERSE = {
    NAME: METHOD.INVERSE,
    TYPE: METHOD,
};
GLSL_OPERATORS.NORMALIZE = {
    NAME: METHOD.NORMALIZE,
    TYPE: METHOD,
};
GLSL_OPERATORS.LENGTH = {
    NAME: METHOD.LENGTH,
    TYPE: METHOD,
};
GLSL_OPERATORS.SINE = {
    NAME: METHOD.SINE,
    TYPE: METHOD,
};
GLSL_OPERATORS.COSINE = {
    NAME: METHOD.COSINE,
    TYPE: METHOD,
};
GLSL_OPERATORS.RADIANS = {
    NAME: METHOD.RADIANS,
    TYPE: METHOD,
};
GLSL_OPERATORS.LUMINANCE = {
    NAME: CUSTOM.LUMINANCE,
    TYPE: CUSTOM,
};
GLSL_OPERATORS.CHANNEL = {
    NAME: CUSTOM.CHANNEL,
    TYPE: CUSTOM,
};
GLSL_OPERATORS.VEC3_TO_VEC4 = {
    NAME: CUSTOM.VEC3_TO_VEC4,
    TYPE: CUSTOM,
};
class Shader {
    constructor() {
        this.glslShader = null;
    }
    bind() {
        if (this.glslShader !== null) {
            console.warn("Shader is already bound!");
        }
        this.glslShader = new GlslShader();
    }
    unbind() {
        GlslShader.currentShader = null;
        this.glslShader = null;
    }
    purge() {
        if (this.glslShader === null) {
            console.warn("No shader bound to purge!");
        }
        else {
            this.glslShader.reset();
            this.unbind();
        }
    }
}
class GlslShader {
    constructor() {
        this.floatPrecision = FLOAT_PRECISION;
        this.glslImages = [];
        // private glslBuffers: GlslBuffer[] = [];
        this.glslCommands = [];
        GlslShader.currentShader = this;
        this.glslContext = new GlslContext(WIDTH, HEIGHT);
    }
    static getCurrentShader() {
        return GlslShader.currentShader;
    }
    reset() {
        this.glslContext.reset();
        GlslShader.currentShader = null;
    }
    static addGlslCommandToCurrentShader(glslCommand) {
        GlslShader.getCurrentShader().addGlslCommand(glslCommand);
    }
    static addGlslImageToCurrentShader(glslImage) {
        GlslShader.getCurrentShader().addGlslImage(glslImage);
    }
    /*static addGlslBufferToCurrentShader(glslBuffer: GlslBuffer) {
       GlslShader.getCurrentShader().addGlslBuffer(glslBuffer);
    }*/
    static getGlslContext() {
        return GlslShader.getCurrentShader().glslContext;
    }
    getGlslImages() {
        return this.glslImages;
    }
    getVertexShaderSource() {
        return [
            "#version 300 es",
            "",
            "in vec3 " + "pos" /* POS */ + ";",
            "in vec2 " + "tex" /* TEX */ + ";",
            "",
            "out vec2 " + "uv" /* UV */ + ";",
            "",
            "void main() {",
            "uv" /* UV */ + " = " + "tex" /* TEX */ + ";",
            "gl_Position = vec4(" + "pos" /* POS */ + ", 1.0);",
            "}",
        ].join("\n");
    }
    getFragmentShaderSource(outVariable) {
        let imageDefinitions = [];
        for (let i = 0; i < this.glslImages.length; i++) {
            imageDefinitions.push(this.glslImages[i].getGlslDefinition());
        }
        /*let bufferDefinitions: string[] = [];
        for (let i = 0; i < this.glslBuffers.length; i++) {
           bufferDefinitions.push(this.glslBuffers[i].getGlslDefinition());
        }*/
        return [
            "#version 300 es",
            "precision " + this.floatPrecision + " float;",
            "",
            "in vec2 " + "uv" /* UV */ + ";",
            "out vec4 " + "fragColor" /* OUT */ + ";",
            "",
            ...imageDefinitions,
            "",
            "float luminance(vec4 image) {",
            "return image.r * " +
                GlslFloat.getJsNumberAsString(LUMINANCE_CHANNEL_QUANTIFIER[0]) +
                " + image.g * " +
                GlslFloat.getJsNumberAsString(LUMINANCE_CHANNEL_QUANTIFIER[1]) +
                " + image.b * " +
                GlslFloat.getJsNumberAsString(LUMINANCE_CHANNEL_QUANTIFIER[2]) +
                ";",
            "}",
            "",
            "void main() {",
            ...this.glslCommands,
            "fragColor" /* OUT */ + " = " + outVariable.getGlslName() + ";",
            "}",
        ].join("\n");
    }
    addGlslCommand(glslCommand) {
        this.glslCommands.push(glslCommand);
    }
    addGlslImage(glslImage) {
        this.glslImages.push(glslImage);
    }
}
/*class GlslBuffer {
   private glslContext: GlslContext;
   private frameTexture: WebGLTexture;
   private frameBuffer: WebGLFramebuffer;

   private uniformGlslName: string;
   private glslVector4: GlslVector4;

   public static render(outVariable: GlslVector4): GlslBuffer {
      const glslBuffer: GlslBuffer = new GlslBuffer();
      glslBuffer.render(outVariable);

      return glslBuffer;
   }

   constructor() {
      this.glslContext = GlslShader.getGlslContext();
      this.uniformGlslName = GlslVariable.getUniqueName("uniform");
      this.glslVector4 = new GlslVector4(
         null,
         "texture(" + this.uniformGlslName + ", " + GLSL_VAR.UV + ")"
      );
   }

   public load(): GlslVector4 {
      GlslShader.addGlslBufferToCurrentShader(this);
      return this.glslVector4;
   }

   public getGlslDefinition(): string {
      return "uniform sampler2D " + this.uniformGlslName + ";";
   }

   private render(outVariable: GlslVector4) {
      this.setUpRenderTexture();

      this.glslContext
         .getGlContext()
         .bindFramebuffer(
            this.glslContext.getGlContext().FRAMEBUFFER,
            this.frameBuffer
         );
      this.glslContext.drawCall(outVariable);
      this.glslContext
         .getGlContext()
         .bindFramebuffer(this.glslContext.getGlContext().FRAMEBUFFER, null);
   }

   private getFrameBuffer(): WebGLFramebuffer {
      return this.frameBuffer;
   }

   private getFrameTexture(): WebGLTexture {
      return this.frameTexture;
   }

   private setUpRenderTexture() {
      let gl = this.glslContext.getGlContext();
      this.frameTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.frameTexture);

      gl.texImage2D(
         gl.TEXTURE_2D,
         0,
         gl.RGBA,
         WIDTH,
         HEIGHT,
         0,
         gl.RGBA,
         gl.UNSIGNED_BYTE,
         null
      );

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      this.frameBuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

      const attachmentPoint = gl.COLOR_ATTACHMENT0;
      gl.framebufferTexture2D(
         gl.FRAMEBUFFER,
         attachmentPoint,
         gl.TEXTURE_2D,
         this.frameTexture,
         0
      );

      const depthBuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);

      gl.renderbufferStorage(
         gl.RENDERBUFFER,
         gl.DEPTH_COMPONENT16,
         WIDTH,
         HEIGHT
      );
      gl.framebufferRenderbuffer(
         gl.FRAMEBUFFER,
         gl.DEPTH_ATTACHMENT,
         gl.RENDERBUFFER,
         depthBuffer
      );

      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
   }
}*/
class GlslContext {
    constructor(width, height) {
        this.glslShader = GlslShader.getCurrentShader();
        this.glCanvas = document.createElement("canvas");
        this.glCanvas.width = width;
        this.glCanvas.height = height;
        this.glContext = this.glCanvas.getContext("webgl2");
    }
    reset() {
        this.glContext.flush();
        this.glContext.finish();
        this.glCanvas.remove();
        this.glContext.getExtension("WEBGL_lose_context").loseContext();
    }
    getGlContext() {
        return this.glContext;
    }
    renderPixelArray(outVariable) {
        return this.renderToPixelArray(outVariable);
    }
    renderDataUrl() {
        return this.glCanvas.toDataURL();
    }
    createShaderProgram(outVariable) {
        let vertexShader = this.glContext.createShader(this.glContext.VERTEX_SHADER);
        let fragmentShader = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
        const vertexShaderSource = this.glslShader.getVertexShaderSource();
        const fragmentShaderSource = this.glslShader.getFragmentShaderSource(outVariable);
        //console.log(vertexShaderSource);
        //console.log(fragmentShaderSource);
        this.glContext.shaderSource(vertexShader, vertexShaderSource);
        this.glContext.shaderSource(fragmentShader, fragmentShaderSource);
        updateStatus("Compiling shader program.");
        this.glContext.compileShader(vertexShader);
        this.glContext.compileShader(fragmentShader);
        let shaderProgram = this.glContext.createProgram();
        this.glContext.attachShader(shaderProgram, vertexShader);
        this.glContext.attachShader(shaderProgram, fragmentShader);
        this.glContext.linkProgram(shaderProgram);
        return shaderProgram;
    }
    loadGlslImages(shaderProgram) {
        const glslImages = this.glslShader.getGlslImages();
        updateStatus("Loading " + glslImages.length + " image(s) for gpu.");
        for (let i = 0; i < glslImages.length; i++) {
            glslImages[i].loadIntoShaderProgram(this.glContext, shaderProgram, i);
        }
    }
    getFrameVAO(shaderProgram) {
        const framePositionLocation = this.glContext.getAttribLocation(shaderProgram, "pos" /* POS */);
        const frameTextureLocation = this.glContext.getAttribLocation(shaderProgram, "tex" /* TEX */);
        const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;
        const frameVertices = [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1];
        const frameTextCoords = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];
        let vaoFrame = this.glContext.createVertexArray();
        this.glContext.bindVertexArray(vaoFrame);
        let vboFrameV = this.glContext.createBuffer();
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameV);
        this.glContext.bufferData(this.glContext.ARRAY_BUFFER, new Float32Array(frameVertices), this.glContext.STATIC_DRAW);
        this.glContext.vertexAttribPointer(framePositionLocation, 2, this.glContext.FLOAT, false, 2 * FLOAT_SIZE, 0);
        this.glContext.enableVertexAttribArray(framePositionLocation);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
        let vboFrameT = this.glContext.createBuffer();
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameT);
        this.glContext.bufferData(this.glContext.ARRAY_BUFFER, new Float32Array(frameTextCoords), this.glContext.STATIC_DRAW);
        this.glContext.vertexAttribPointer(frameTextureLocation, 2, this.glContext.FLOAT, false, 2 * FLOAT_SIZE, 0);
        this.glContext.enableVertexAttribArray(frameTextureLocation);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
        this.glContext.bindVertexArray(null);
        return vaoFrame;
    }
    drawArraysFromVAO(vaoFrame) {
        this.glContext.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
        this.glContext.clearColor(0, 0, 0, 0);
        this.glContext.clear(this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT);
        this.glContext.blendFunc(this.glContext.SRC_ALPHA, this.glContext.ONE);
        this.glContext.enable(this.glContext.BLEND);
        this.glContext.disable(this.glContext.DEPTH_TEST);
        this.glContext.bindVertexArray(vaoFrame);
        this.glContext.drawArrays(this.glContext.TRIANGLES, 0, 6);
        this.glContext.bindVertexArray(null);
    }
    readToPixelArray() {
        let pixelArray = new Uint8Array(this.glCanvas.width * this.glCanvas.height * 4);
        this.glContext.readPixels(0, 0, this.glCanvas.width, this.glCanvas.height, this.glContext.RGBA, this.glContext.UNSIGNED_BYTE, pixelArray);
        return pixelArray;
    }
    renderToPixelArray(outVariable) {
        this.drawCall(outVariable);
        const pixelArray = this.readToPixelArray();
        return pixelArray;
    }
    drawCall(outVariable) {
        const shaderProgram = this.createShaderProgram(outVariable);
        this.glContext.useProgram(shaderProgram);
        this.loadGlslImages(shaderProgram);
        updateStatus("Rendering on gpu.");
        const vaoFrame = this.getFrameVAO(shaderProgram);
        this.drawArraysFromVAO(vaoFrame);
    }
}
class GlslRendering {
    constructor(glslContext, outVariable) {
        this.glslContext = glslContext;
        this.outVariable = outVariable;
    }
    static render(outVariable) {
        return new GlslRendering(GlslShader.getGlslContext(), outVariable);
    }
    getPixelArray() {
        if (this.pixelArray === undefined) {
            this.pixelArray = this.glslContext.renderPixelArray(this.outVariable);
        }
        return this.pixelArray;
    }
    getDataUrl() {
        if (this.dataUrl === undefined) {
            this.getPixelArray();
            this.dataUrl = this.glslContext.renderDataUrl();
        }
        return this.dataUrl;
    }
    getJsImage(onloadCallback) {
        if (this.jsImage === undefined) {
            this.jsImage = new Image();
            this.jsImage.addEventListener("load", onloadCallback);
            this.jsImage.src = this.getDataUrl();
        }
        return this.jsImage;
    }
}
class GlslOperation {
    constructor(callingParameter, result, parameters, glslOperator) {
        this.callingParameter = callingParameter;
        this.result = result;
        this.parameters = parameters;
        this.glslOperator = glslOperator;
    }
    static getGlslExpressionOfParams(methodName, params) {
        if (params.length === 1) {
            return params[0];
        }
        else if (params.length === 2) {
            return methodName + "(" + params[0] + ", " + params[1] + ")";
        }
        else {
            return (methodName +
                "(" +
                params.pop() +
                ", " +
                GlslOperation.getGlslExpressionOfParams(methodName, params) +
                ")");
        }
    }
    getDeclaration() {
        const glslNames = GlslVariable.getGlslNamesOfGlslVariables(this.parameters);
        if (this.glslOperator.TYPE === SYMBOL) {
            glslNames.unshift(this.callingParameter.getGlslName());
            return (this.result.getGlslName() +
                " = " +
                glslNames.join(this.glslOperator.NAME) +
                ";");
        }
        else if (this.glslOperator.TYPE === METHOD) {
            if (this.glslOperator.NAME === METHOD.MAXIMUM ||
                this.glslOperator.NAME === METHOD.MINIMUM) {
                glslNames.unshift(this.callingParameter.getGlslName());
                return (this.result.getGlslName() +
                    " = " +
                    GlslOperation.getGlslExpressionOfParams(this.glslOperator.NAME, glslNames) +
                    ";");
            }
            return (this.result.getGlslName() +
                " = " +
                this.glslOperator.NAME +
                "(" +
                glslNames.join(", ") +
                ");");
        }
        else if (this.glslOperator.TYPE === CUSTOM) {
            if (this.glslOperator.NAME === CUSTOM.CHANNEL) {
                return (this.result.getGlslName() +
                    " = " +
                    glslNames[0] +
                    "[" +
                    glslNames[1] +
                    "];");
            }
            else if (this.glslOperator.NAME === CUSTOM.VEC3_TO_VEC4) {
                return (this.result.getGlslName() +
                    " = vec4(" +
                    glslNames[0] +
                    ", " +
                    glslNames[1] +
                    ");");
            }
            else if (this.glslOperator.NAME === CUSTOM.LUMINANCE) {
                return (this.result.getGlslName() +
                    " = " +
                    this.glslOperator.NAME +
                    "(" +
                    glslNames[0] +
                    ");");
            }
        }
    }
}
class GlslImage {
    constructor(jsImage) {
        this.jsImage = jsImage;
        this.uniformGlslName = GlslVariable.getUniqueName("uniform");
        this.glslVector4 = new GlslVector4(null, "texture(" + this.uniformGlslName + ", " + "uv" /* UV */ + ")");
        GlslShader.addGlslImageToCurrentShader(this);
    }
    static load(jsImage) {
        let glslImage = new GlslImage(jsImage);
        return glslImage.glslVector4;
    }
    getGlslDefinition() {
        return "uniform sampler2D " + this.uniformGlslName + ";";
    }
    createTexture(glContext) {
        let texture = glContext.createTexture();
        glContext.bindTexture(glContext.TEXTURE_2D, texture);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_S, glContext.CLAMP_TO_EDGE);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_WRAP_T, glContext.CLAMP_TO_EDGE);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MIN_FILTER, glContext.LINEAR);
        glContext.texParameteri(glContext.TEXTURE_2D, glContext.TEXTURE_MAG_FILTER, glContext.LINEAR);
        glContext.texImage2D(glContext.TEXTURE_2D, 0, glContext.RGBA, glContext.RGBA, glContext.UNSIGNED_BYTE, this.jsImage);
        return texture;
    }
    loadIntoShaderProgram(glContext, shaderProgram, textureUnit) {
        glContext.activeTexture(glContext.TEXTURE0 + textureUnit);
        glContext.bindTexture(glContext.TEXTURE_2D, this.createTexture(glContext));
        glContext.uniform1i(glContext.getUniformLocation(shaderProgram, this.uniformGlslName), textureUnit);
    }
}
class GlslVariable {
    constructor(customDeclaration = "") {
        this.glslName = GlslVariable.getUniqueName(this.getGlslVarType());
        if (customDeclaration !== null) {
            if (customDeclaration !== "") {
                customDeclaration = " = " + customDeclaration;
            }
            GlslShader.addGlslCommandToCurrentShader(this.getGlslVarType() +
                " " +
                this.getGlslName() +
                customDeclaration +
                ";");
        }
    }
    static getUniqueName(prefix) {
        GlslVariable.uniqueNumber++;
        return prefix + "_" + GlslVariable.uniqueNumber.toString();
    }
    static getGlslNamesOfGlslVariables(glslVariables) {
        let glslNames = [];
        if (glslVariables !== null) {
            for (let i = 0; i < glslVariables.length; i++) {
                glslNames.push(glslVariables[i].getGlslName());
            }
        }
        return glslNames;
    }
    getGlslName() {
        return this.glslName;
    }
    declareGlslResult(glslOperation) {
        GlslShader.addGlslCommandToCurrentShader(glslOperation.getDeclaration());
    }
    getGlslFloatResult(operants, operator) {
        const glslResult = new GlslFloat();
        this.declareGlslResult(new GlslOperation(this, glslResult, operants, operator));
        return glslResult;
    }
    getGlslVector3Result(operants, operator) {
        const glslResult = new GlslVector3();
        this.declareGlslResult(new GlslOperation(this, glslResult, operants, operator));
        return glslResult;
    }
    getGlslVector4Result(operants, operator) {
        const glslResult = new GlslVector4();
        this.declareGlslResult(new GlslOperation(this, glslResult, operants, operator));
        return glslResult;
    }
    getGlslMatrix3Result(operants, operator) {
        const glslResult = new GlslMatrix3();
        this.declareGlslResult(new GlslOperation(this, glslResult, operants, operator));
        return glslResult;
    }
}
GlslVariable.uniqueNumber = 0;
class GlslVector extends GlslVariable {
    channel(channel) {
        return this.getGlslFloatResult([this, new GlslInteger(channel)], GLSL_OPERATORS.CHANNEL);
    }
}
class GlslMatrix extends GlslVariable {
}
class GlslInteger extends GlslVariable {
    constructor(jsNumber = null) {
        if (jsNumber !== null) {
            super(null);
            this.glslName = jsNumber.toString();
        }
        else {
            super();
        }
    }
    getGlslVarType() {
        return "int" /* INT */;
    }
    addFloat(...addends) {
        throw new Error("Method not implemented.");
    }
    addVector3(...addends) {
        throw new Error("Method not implemented.");
    }
    addVector4(...addends) {
        throw new Error("Method not implemented.");
    }
    addMatrix3(...addends) {
        throw new Error("Method not implemented.");
    }
    subtractFloat(...subtrahends) {
        throw new Error("Method not implemented.");
    }
    subtractVector3(...subtrahends) {
        throw new Error("Method not implemented.");
    }
    subtractVector4(...subtrahends) {
        throw new Error("Method not implemented.");
    }
    subtractMatrix3(...subtrahends) {
        throw new Error("Method not implemented.");
    }
    multiplyFloat(...factors) {
        throw new Error("Method not implemented.");
    }
    multiplyVector3(...factors) {
        throw new Error("Method not implemented.");
    }
    multiplyVector4(...factors) {
        throw new Error("Method not implemented.");
    }
    multiplyMatrix3(...factors) {
        throw new Error("Method not implemented.");
    }
    divideFloat(...divisors) {
        throw new Error("Method not implemented.");
    }
}
class GlslFloat extends GlslVariable {
    static getJsNumberAsString(number) {
        if (Math.trunc(number) === number) {
            return number.toString() + ".0";
        }
        if (number.toString().includes("e-")) {
            //console.warn(number.toString() + " is converted to zero.");
            return "0.0";
        }
        return number.toString();
    }
    constructor(jsNumber = null) {
        if (jsNumber !== null) {
            super(null);
            this.glslName = GlslFloat.getJsNumberAsString(jsNumber);
        }
        else {
            super();
        }
    }
    getGlslName() {
        return this.glslName;
    }
    getGlslVarType() {
        return "float" /* FLOAT */;
    }
    addFloat(...addends) {
        return this.getGlslFloatResult(addends, GLSL_OPERATORS.ADD);
    }
    addVector3(...addends) {
        return this.getGlslVector3Result(addends, GLSL_OPERATORS.ADD);
    }
    addVector4(...addends) {
        return this.getGlslVector4Result(addends, GLSL_OPERATORS.ADD);
    }
    addMatrix3(...addends) {
        return this.getGlslMatrix3Result(addends, GLSL_OPERATORS.ADD);
    }
    subtractFloat(...subtrahends) {
        return this.getGlslFloatResult(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractVector3(...subtrahends) {
        return this.getGlslVector3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractVector4(...subtrahends) {
        return this.getGlslVector4Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractMatrix3(...subtrahends) {
        return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    multiplyFloat(...factors) {
        return this.getGlslFloatResult(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyVector3(...factors) {
        return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyVector4(...factors) {
        return this.getGlslVector4Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyMatrix3(...factors) {
        return this.getGlslMatrix3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    divideFloat(...divisors) {
        return this.getGlslFloatResult(divisors, GLSL_OPERATORS.DIVIDE);
    }
    maximum(...parameters) {
        return this.getGlslFloatResult(parameters, GLSL_OPERATORS.MAXIMUM);
    }
    minimum(...parameters) {
        return this.getGlslFloatResult(parameters, GLSL_OPERATORS.MINIMUM);
    }
    radians() {
        return this.getGlslFloatResult([this], GLSL_OPERATORS.RADIANS);
    }
    sin() {
        return this.getGlslFloatResult([this], GLSL_OPERATORS.SINE);
    }
    cos() {
        return this.getGlslFloatResult([this], GLSL_OPERATORS.COSINE);
    }
}
class GlslVector3 extends GlslVector {
    constructor(vector3 = undefined) {
        let customDeclaration = "";
        if (vector3 !== undefined) {
            let vector3GlslNames = [];
            for (let i = 0; i < vector3.length; i++) {
                vector3GlslNames.push(vector3[i].getGlslName());
            }
            customDeclaration =
                "vec3" /* VEC3 */ + "(" + vector3GlslNames.join(", ") + ")";
        }
        super(customDeclaration);
    }
    getGlslVarType() {
        return "vec3" /* VEC3 */;
    }
    addFloat(...addends) {
        return this.getGlslVector3Result(addends, GLSL_OPERATORS.ADD);
    }
    addVector3(...addends) {
        return this.getGlslVector3Result(addends, GLSL_OPERATORS.ADD);
    }
    addVector4(...addends) {
        throw new Error("Not possible to add vec4 to vec3.");
    }
    addMatrix3(...addends) {
        throw new Error("Not possible to add mat3 to vec3.");
    }
    subtractFloat(...subtrahends) {
        return this.getGlslVector3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractVector3(...subtrahends) {
        return this.getGlslVector3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractVector4(...subtrahends) {
        throw new Error("Not possible to subtract vec4 from vec3.");
    }
    subtractMatrix3(...subtrahends) {
        throw new Error("Not possible to subtract mat3 from vec3.");
    }
    multiplyFloat(...factors) {
        return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyVector3(...factors) {
        return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyVector4(...factors) {
        throw new Error("Not possible to multiply vec4 with vec3.");
    }
    multiplyMatrix3(...factors) {
        return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    divideFloat(...divisors) {
        return this.getGlslVector3Result(divisors, GLSL_OPERATORS.DIVIDE);
    }
    length() {
        return this.getGlslFloatResult([this], GLSL_OPERATORS.LENGTH);
    }
    normalize() {
        return this.getGlslVector3Result([this], GLSL_OPERATORS.NORMALIZE);
    }
    maximum(...parameters) {
        return this.getGlslVector3Result(parameters, GLSL_OPERATORS.MAXIMUM);
    }
    minimum(...parameters) {
        return this.getGlslVector3Result(parameters, GLSL_OPERATORS.MINIMUM);
    }
    getVector4(fourthChannel = new GlslFloat(1)) {
        return this.getGlslVector4Result([this, fourthChannel], GLSL_OPERATORS.VEC3_TO_VEC4);
    }
}
class GlslVector4 extends GlslVector {
    constructor(vector4 = undefined, customDeclaration = "") {
        if (customDeclaration === "") {
            if (vector4 !== undefined && vector4 !== null) {
                let vector4GlslNames = [];
                for (let i = 0; i < vector4.length; i++) {
                    vector4GlslNames.push(vector4[i].getGlslName());
                }
                customDeclaration =
                    "vec4" /* VEC4 */ + "(" + vector4GlslNames.join(", ") + ")";
            }
        }
        super(customDeclaration);
    }
    getGlslVarType() {
        return "vec4" /* VEC4 */;
    }
    addFloat(...addends) {
        return this.getGlslVector4Result(addends, GLSL_OPERATORS.ADD);
    }
    addVector3(...addends) {
        throw new Error("Not possible to add vec3 to vec4.");
    }
    addVector4(...addends) {
        return this.getGlslVector4Result(addends, GLSL_OPERATORS.ADD);
    }
    addMatrix3(...addends) {
        throw new Error("Not possible to add mat3 to vec4.");
    }
    subtractFloat(...subtrahends) {
        return this.getGlslVector4Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractVector3(...subtrahends) {
        throw new Error("Not possible to subtract vec3 from vec4.");
    }
    subtractVector4(...subtrahends) {
        return this.getGlslVector4Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractMatrix3(...subtrahends) {
        throw new Error("Not possible to subtract mat3 from vec4.");
    }
    multiplyFloat(...factors) {
        return this.getGlslVector4Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyVector3(...factors) {
        throw new Error("Not possible to multiply vec3 with vec4.");
    }
    multiplyVector4(...factors) {
        return this.getGlslVector4Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyMatrix3(...factors) {
        throw new Error("Not possible to multiply mat3 with vec4.");
    }
    divideFloat(...divisors) {
        return this.getGlslVector4Result(divisors, GLSL_OPERATORS.DIVIDE);
    }
    length() {
        return this.getGlslFloatResult([this], GLSL_OPERATORS.LENGTH);
    }
    normalize() {
        return this.getGlslVector4Result([this], GLSL_OPERATORS.NORMALIZE);
    }
    maximum(...parameters) {
        return this.getGlslVector4Result(parameters, GLSL_OPERATORS.MAXIMUM);
    }
    minimum(...parameters) {
        return this.getGlslVector4Result(parameters, GLSL_OPERATORS.MINIMUM);
    }
    getLuminanceFloat() {
        return this.getGlslFloatResult([this], GLSL_OPERATORS.LUMINANCE);
    }
}
class GlslMatrix3 extends GlslMatrix {
    /*public matrix3: [
       [GlslFloat, GlslFloat, GlslFloat],
       [GlslFloat, GlslFloat, GlslFloat],
       [GlslFloat, GlslFloat, GlslFloat]
    ];*/
    constructor(matrix3 = undefined) {
        let customDeclaration = "";
        if (matrix3 !== undefined) {
            let matrix3GlslNames = [
                [null, null, null],
                [null, null, null],
                [null, null, null],
            ];
            for (let r = 0; r < matrix3.length; r++) {
                for (let c = 0; c < matrix3[0].length; c++) {
                    matrix3GlslNames[r][c] = matrix3[r][c].getGlslName();
                }
            }
            if (matrix3 !== undefined) {
                customDeclaration =
                    "mat3" /* MAT3 */ +
                        "(" +
                        matrix3GlslNames[0][0] +
                        ", " +
                        matrix3GlslNames[1][0] +
                        ", " +
                        matrix3GlslNames[2][0] +
                        ", " +
                        matrix3GlslNames[0][1] +
                        ", " +
                        matrix3GlslNames[1][1] +
                        ", " +
                        matrix3GlslNames[2][1] +
                        ", " +
                        matrix3GlslNames[0][2] +
                        ", " +
                        matrix3GlslNames[1][2] +
                        ", " +
                        matrix3GlslNames[2][2] +
                        ")";
            }
        }
        super(customDeclaration);
    }
    getGlslVarType() {
        return "mat3" /* MAT3 */;
    }
    addFloat(...addends) {
        return this.getGlslMatrix3Result(addends, GLSL_OPERATORS.ADD);
    }
    addVector3(...addends) {
        throw new Error("Not possible to add vec3 to mat3.");
    }
    addVector4(...addends) {
        throw new Error("Not possible to add vec4 to mat3.");
    }
    addMatrix3(...addends) {
        return this.getGlslMatrix3Result(addends, GLSL_OPERATORS.ADD);
    }
    subtractFloat(...subtrahends) {
        return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    subtractVector3(...subtrahends) {
        throw new Error("Not possible to subtract vec3 from mat3.");
    }
    subtractVector4(...subtrahends) {
        throw new Error("Not possible to subtract vec4 from mat3.");
    }
    subtractMatrix3(...subtrahends) {
        return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
    }
    multiplyFloat(...factors) {
        return this.getGlslMatrix3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyVector3(...factors) {
        return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    multiplyVector4(...factors) {
        throw new Error("Not possible to multiply vec4 with mat3.");
    }
    multiplyMatrix3(...factors) {
        return this.getGlslMatrix3Result(factors, GLSL_OPERATORS.MULTIPLY);
    }
    divideFloat(...divisors) {
        return this.getGlslMatrix3Result(divisors, GLSL_OPERATORS.DIVIDE);
    }
    inverse() {
        return this.getGlslMatrix3Result([this], GLSL_OPERATORS.INVERSE);
    }
}
