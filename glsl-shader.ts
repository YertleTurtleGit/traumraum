"use strict";

const enum GPU_GL_FLOAT_PRECISION {
   MEDIUM = "medium" + "p",
   HIGH = "high" + "p",
}

/*
The float precision used on the gpu. Set to medium when facing errors.
*/
const FLOAT_PRECISION = GPU_GL_FLOAT_PRECISION.HIGH;

const LUMINANCE_CHANNEL_QUANTIFIER: [number, number, number] = [
   1 / 3,
   1 / 3,
   1 / 3,
];

enum SYMBOL {
   ADD = " + ",
   SUBTRACT = " - ",
   MULTIPLY = " * ",
   DIVIDE = " / ",
}

enum METHOD {
   MAXIMUM = "max",
   MINIMUM = "min",
   INVERSE = "inverse",
   NORMALIZE = "normalize",
   LENGTH = "length",
   SINE = "sin",
   COSINE = "cos",
   RADIANS = "radians",
}

enum CUSTOM {
   LUMINANCE = "luminance",
   CHANNEL = "channel",
   VEC3_TO_VEC4 = "vec3_to_vec4",
}

interface GLSL_OPERATOR {
   readonly NAME: string;
   readonly TYPE: typeof SYMBOL | typeof METHOD | typeof CUSTOM;
}

class GLSL_OPERATORS {
   public static readonly ADD: GLSL_OPERATOR = {
      NAME: SYMBOL.ADD,
      TYPE: SYMBOL,
   };
   public static readonly SUBTRACT: GLSL_OPERATOR = {
      NAME: SYMBOL.SUBTRACT,
      TYPE: SYMBOL,
   };
   public static readonly MULTIPLY: GLSL_OPERATOR = {
      NAME: SYMBOL.MULTIPLY,
      TYPE: SYMBOL,
   };
   public static readonly DIVIDE: GLSL_OPERATOR = {
      NAME: SYMBOL.DIVIDE,
      TYPE: SYMBOL,
   };

   public static readonly MAXIMUM: GLSL_OPERATOR = {
      NAME: METHOD.MAXIMUM,
      TYPE: METHOD,
   };
   public static readonly MINIMUM: GLSL_OPERATOR = {
      NAME: METHOD.MINIMUM,
      TYPE: METHOD,
   };
   public static readonly INVERSE: GLSL_OPERATOR = {
      NAME: METHOD.INVERSE,
      TYPE: METHOD,
   };
   public static readonly NORMALIZE: GLSL_OPERATOR = {
      NAME: METHOD.NORMALIZE,
      TYPE: METHOD,
   };
   public static readonly LENGTH: GLSL_OPERATOR = {
      NAME: METHOD.LENGTH,
      TYPE: METHOD,
   };
   public static readonly SINE: GLSL_OPERATOR = {
      NAME: METHOD.SINE,
      TYPE: METHOD,
   };
   public static readonly COSINE: GLSL_OPERATOR = {
      NAME: METHOD.COSINE,
      TYPE: METHOD,
   };
   public static readonly RADIANS: GLSL_OPERATOR = {
      NAME: METHOD.RADIANS,
      TYPE: METHOD,
   };
   public static readonly LUMINANCE: GLSL_OPERATOR = {
      NAME: CUSTOM.LUMINANCE,
      TYPE: CUSTOM,
   };

   public static readonly CHANNEL: GLSL_OPERATOR = {
      NAME: CUSTOM.CHANNEL,
      TYPE: CUSTOM,
   };
   public static readonly VEC3_TO_VEC4: GLSL_OPERATOR = {
      NAME: CUSTOM.VEC3_TO_VEC4,
      TYPE: CUSTOM,
   };

   private constructor() {}
}

const enum GLSL_VAR {
   UV = "uv",
   TEX = "tex",
   POS = "pos",
   OUT = "fragColor",
}

const enum GLSL_TYPE {
   FLOAT = "float",
   VEC3 = "vec3",
   VEC4 = "vec4",
   MAT3 = "mat3",
   INT = "int",
}

const enum GLSL_CHANNEL {
   X = 0,
   Y = 1,
   Z = 2,
   W = 3,
   RED = 0,
   GREEN = 1,
   BLUE = 2,
   ALPHA = 3,
   C0 = 0,
   C1 = 1,
   C2 = 2,
   C3 = 3,
}

class Shader {
   private glslShader: GlslShader = null;

   public bind() {
      if (this.glslShader !== null) {
         console.warn("Shader is already bound!");
      }
      this.glslShader = new GlslShader();
   }

   public unbind() {
      GlslShader.currentShader = null;
      this.glslShader = null;
   }

   public purge() {
      if (this.glslShader === null) {
         console.warn("No shader bound to purge!");
      } else {
         this.glslShader.reset();
         this.unbind();
      }
   }
}

class GlslShader {
   public static currentShader: GlslShader;

   public static getCurrentShader(): GlslShader {
      return GlslShader.currentShader;
   }

   public reset(): void {
      this.glslContext.reset();
      GlslShader.currentShader = null;
   }

   public static addGlslCommandToCurrentShader(glslCommand: string): void {
      GlslShader.getCurrentShader().addGlslCommand(glslCommand);
   }

   public static addGlslImageToCurrentShader(glslImage: GlslImage): void {
      GlslShader.getCurrentShader().addGlslImage(glslImage);
   }

   /*static addGlslBufferToCurrentShader(glslBuffer: GlslBuffer) {
      GlslShader.getCurrentShader().addGlslBuffer(glslBuffer);
   }*/

   public static getGlslContext(): GlslContext {
      return GlslShader.getCurrentShader().glslContext;
   }

   private floatPrecision: GPU_GL_FLOAT_PRECISION = FLOAT_PRECISION;

   private glslContext: GlslContext;

   private glslImages: GlslImage[] = [];
   // private glslBuffers: GlslBuffer[] = [];
   private glslCommands: string[] = [];

   constructor() {
      GlslShader.currentShader = this;
      this.glslContext = new GlslContext(WIDTH, HEIGHT);
   }

   public getGlslImages(): GlslImage[] {
      return this.glslImages;
   }

   public getVertexShaderSource(): string {
      return [
         "#version 300 es",
         "",
         "in vec3 " + GLSL_VAR.POS + ";",
         "in vec2 " + GLSL_VAR.TEX + ";",
         "",
         "out vec2 " + GLSL_VAR.UV + ";",
         "",
         "void main() {",
         GLSL_VAR.UV + " = " + GLSL_VAR.TEX + ";",
         "gl_Position = vec4(" + GLSL_VAR.POS + ", 1.0);",
         "}",
      ].join("\n");
   }

   public getFragmentShaderSource(outVariable: GlslVector4): string {
      let imageDefinitions: string[] = [];
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
         "in vec2 " + GLSL_VAR.UV + ";",
         "out vec4 " + GLSL_VAR.OUT + ";",
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
         GLSL_VAR.OUT + " = " + outVariable.getGlslName() + ";",
         "}",
      ].join("\n");
   }

   private addGlslCommand(glslCommand: string): void {
      this.glslCommands.push(glslCommand);
   }

   private addGlslImage(glslImage: GlslImage): void {
      this.glslImages.push(glslImage);
   }

   /*private addGlslBuffer(glslBuffer: GlslBuffer): void {
      this.glslBuffers.push(glslBuffer);
   }*/
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
   private glslShader: GlslShader;
   private glContext: WebGL2RenderingContext;
   private glCanvas: HTMLCanvasElement;

   constructor(width: number, height: number) {
      this.glslShader = GlslShader.getCurrentShader();
      this.glCanvas = document.createElement("canvas");
      this.glCanvas.width = width;
      this.glCanvas.height = height;
      this.glContext = this.glCanvas.getContext("webgl2");
   }

   public reset(): void {
      this.glContext.flush();
      this.glContext.finish();
      this.glCanvas.remove();
      this.glContext.getExtension("WEBGL_lose_context").loseContext();
   }

   public getGlContext(): WebGL2RenderingContext {
      return this.glContext;
   }

   public renderPixelArray(outVariable: GlslVector4): Uint8Array {
      return this.renderToPixelArray(outVariable);
   }

   public renderDataUrl(): string {
      return this.glCanvas.toDataURL();
   }

   private createShaderProgram(outVariable: GlslVector4): WebGLProgram {
      let vertexShader: WebGLShader = this.glContext.createShader(
         this.glContext.VERTEX_SHADER
      );
      let fragmentShader: WebGLShader = this.glContext.createShader(
         this.glContext.FRAGMENT_SHADER
      );

      const vertexShaderSource: string = this.glslShader.getVertexShaderSource();
      const fragmentShaderSource: string = this.glslShader.getFragmentShaderSource(
         outVariable
      );

      //console.log(vertexShaderSource);
      //console.log(fragmentShaderSource);

      this.glContext.shaderSource(vertexShader, vertexShaderSource);
      this.glContext.shaderSource(fragmentShader, fragmentShaderSource);

      updateStatus("Compiling shader program.");
      this.glContext.compileShader(vertexShader);
      this.glContext.compileShader(fragmentShader);

      let shaderProgram: WebGLProgram = this.glContext.createProgram();
      this.glContext.attachShader(shaderProgram, vertexShader);
      this.glContext.attachShader(shaderProgram, fragmentShader);
      this.glContext.linkProgram(shaderProgram);

      return shaderProgram;
   }

   private loadGlslImages(shaderProgram: WebGLProgram): void {
      const glslImages: GlslImage[] = this.glslShader.getGlslImages();
      updateStatus("Loading " + glslImages.length + " image(s) for gpu.");

      for (let i = 0; i < glslImages.length; i++) {
         glslImages[i].loadIntoShaderProgram(this.glContext, shaderProgram, i);
      }
   }

   public getFrameVAO(shaderProgram: WebGLProgram): WebGLVertexArrayObject {
      const framePositionLocation = this.glContext.getAttribLocation(
         shaderProgram,
         GLSL_VAR.POS
      );
      const frameTextureLocation = this.glContext.getAttribLocation(
         shaderProgram,
         GLSL_VAR.TEX
      );

      const FLOAT_SIZE = Float32Array.BYTES_PER_ELEMENT;

      const frameVertices = [-1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1];
      const frameTextCoords = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];

      let vaoFrame = this.glContext.createVertexArray();
      this.glContext.bindVertexArray(vaoFrame);

      let vboFrameV = this.glContext.createBuffer();
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameV);
      this.glContext.bufferData(
         this.glContext.ARRAY_BUFFER,
         new Float32Array(frameVertices),
         this.glContext.STATIC_DRAW
      );
      this.glContext.vertexAttribPointer(
         framePositionLocation,
         2,
         this.glContext.FLOAT,
         false,
         2 * FLOAT_SIZE,
         0
      );
      this.glContext.enableVertexAttribArray(framePositionLocation);
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);

      let vboFrameT = this.glContext.createBuffer();
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, vboFrameT);
      this.glContext.bufferData(
         this.glContext.ARRAY_BUFFER,
         new Float32Array(frameTextCoords),
         this.glContext.STATIC_DRAW
      );
      this.glContext.vertexAttribPointer(
         frameTextureLocation,
         2,
         this.glContext.FLOAT,
         false,
         2 * FLOAT_SIZE,
         0
      );
      this.glContext.enableVertexAttribArray(frameTextureLocation);
      this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);

      this.glContext.bindVertexArray(null);

      return vaoFrame;
   }

   public drawArraysFromVAO(vaoFrame: WebGLVertexArrayObject) {
      this.glContext.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
      this.glContext.clearColor(0, 0, 0, 0);
      this.glContext.clear(
         this.glContext.COLOR_BUFFER_BIT | this.glContext.DEPTH_BUFFER_BIT
      );

      this.glContext.blendFunc(this.glContext.SRC_ALPHA, this.glContext.ONE);
      this.glContext.enable(this.glContext.BLEND);
      this.glContext.disable(this.glContext.DEPTH_TEST);

      this.glContext.bindVertexArray(vaoFrame);
      this.glContext.drawArrays(this.glContext.TRIANGLES, 0, 6);
      this.glContext.bindVertexArray(null);
   }

   private readToPixelArray(): Uint8Array {
      let pixelArray: Uint8Array = new Uint8Array(
         this.glCanvas.width * this.glCanvas.height * 4
      );

      this.glContext.readPixels(
         0,
         0,
         this.glCanvas.width,
         this.glCanvas.height,
         this.glContext.RGBA,
         this.glContext.UNSIGNED_BYTE,
         pixelArray
      );

      return pixelArray;
   }

   public renderToPixelArray(outVariable: GlslVector4): Uint8Array {
      this.drawCall(outVariable);
      const pixelArray: Uint8Array = this.readToPixelArray();
      return pixelArray;
   }

   public drawCall(outVariable: GlslVector4): void {
      const shaderProgram: WebGLProgram = this.createShaderProgram(outVariable);
      this.glContext.useProgram(shaderProgram);
      this.loadGlslImages(shaderProgram);

      updateStatus("Rendering on gpu.");

      const vaoFrame = this.getFrameVAO(shaderProgram);
      this.drawArraysFromVAO(vaoFrame);
   }
}

class GlslRendering {
   public static render(outVariable: GlslVector4) {
      return new GlslRendering(GlslShader.getGlslContext(), outVariable);
   }

   private glslContext: GlslContext;
   private outVariable: GlslVector4;

   private pixelArray: Uint8Array;
   private dataUrl: string;
   private jsImage: HTMLImageElement;

   private constructor(glslContext: GlslContext, outVariable: GlslVector4) {
      this.glslContext = glslContext;
      this.outVariable = outVariable;
   }

   public getPixelArray(): Uint8Array {
      if (this.pixelArray === undefined) {
         this.pixelArray = this.glslContext.renderPixelArray(this.outVariable);
      }
      return this.pixelArray;
   }

   public getDataUrl(): string {
      if (this.dataUrl === undefined) {
         this.getPixelArray();
         this.dataUrl = this.glslContext.renderDataUrl();
      }
      return this.dataUrl;
   }

   public getJsImage(onloadCallback): HTMLImageElement {
      if (this.jsImage === undefined) {
         this.jsImage = new Image();
         this.jsImage.addEventListener("load", onloadCallback);
         this.jsImage.src = this.getDataUrl();
      }
      return this.jsImage;
   }
}

class GlslOperation {
   private callingParameter: GlslVariable;
   private result: GlslVariable;
   private parameters: GlslVariable[];
   private glslOperator: GLSL_OPERATOR;

   constructor(
      callingParameter: GlslVariable,
      result: GlslVariable,
      parameters: GlslVariable[],
      glslOperator: GLSL_OPERATOR
   ) {
      this.callingParameter = callingParameter;
      this.result = result;
      this.parameters = parameters;
      this.glslOperator = glslOperator;
   }

   private static getGlslExpressionOfParams(
      methodName: string,
      params: string[]
   ): string {
      if (params.length === 1) {
         return params[0];
      } else if (params.length === 2) {
         return methodName + "(" + params[0] + ", " + params[1] + ")";
      } else {
         return (
            methodName +
            "(" +
            params.pop() +
            ", " +
            GlslOperation.getGlslExpressionOfParams(methodName, params) +
            ")"
         );
      }
   }

   public getDeclaration(): string {
      const glslNames: string[] = GlslVariable.getGlslNamesOfGlslVariables(
         this.parameters
      );

      if (this.glslOperator.TYPE === SYMBOL) {
         glslNames.unshift(this.callingParameter.getGlslName());
         return (
            this.result.getGlslName() +
            " = " +
            glslNames.join(this.glslOperator.NAME) +
            ";"
         );
      } else if (this.glslOperator.TYPE === METHOD) {
         if (
            this.glslOperator.NAME === METHOD.MAXIMUM ||
            this.glslOperator.NAME === METHOD.MINIMUM
         ) {
            glslNames.unshift(this.callingParameter.getGlslName());
            return (
               this.result.getGlslName() +
               " = " +
               GlslOperation.getGlslExpressionOfParams(
                  this.glslOperator.NAME,
                  glslNames
               ) +
               ";"
            );
         }
         return (
            this.result.getGlslName() +
            " = " +
            this.glslOperator.NAME +
            "(" +
            glslNames.join(", ") +
            ");"
         );
      } else if (this.glslOperator.TYPE === CUSTOM) {
         if (this.glslOperator.NAME === CUSTOM.CHANNEL) {
            return (
               this.result.getGlslName() +
               " = " +
               glslNames[0] +
               "[" +
               glslNames[1] +
               "];"
            );
         } else if (this.glslOperator.NAME === CUSTOM.VEC3_TO_VEC4) {
            return (
               this.result.getGlslName() +
               " = vec4(" +
               glslNames[0] +
               ", " +
               glslNames[1] +
               ");"
            );
         } else if (this.glslOperator.NAME === CUSTOM.LUMINANCE) {
            return (
               this.result.getGlslName() +
               " = " +
               this.glslOperator.NAME +
               "(" +
               glslNames[0] +
               ");"
            );
         }
      }
   }
}

class GlslImage {
   private jsImage: HTMLImageElement;
   private uniformGlslName: string;
   private glslVector4: GlslVector4;

   public static load(jsImage: HTMLImageElement): GlslVector4 {
      let glslImage = new GlslImage(jsImage);
      return glslImage.glslVector4;
   }

   private constructor(jsImage: HTMLImageElement) {
      this.jsImage = jsImage;
      this.uniformGlslName = GlslVariable.getUniqueName("uniform");
      this.glslVector4 = new GlslVector4(
         null,
         "texture(" + this.uniformGlslName + ", " + GLSL_VAR.UV + ")"
      );
      GlslShader.addGlslImageToCurrentShader(this);
   }

   public getGlslDefinition(): string {
      return "uniform sampler2D " + this.uniformGlslName + ";";
   }

   public createTexture(glContext: WebGL2RenderingContext): WebGLTexture {
      let texture = glContext.createTexture();
      glContext.bindTexture(glContext.TEXTURE_2D, texture);

      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_WRAP_S,
         glContext.CLAMP_TO_EDGE
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_WRAP_T,
         glContext.CLAMP_TO_EDGE
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_MIN_FILTER,
         glContext.LINEAR
      );
      glContext.texParameteri(
         glContext.TEXTURE_2D,
         glContext.TEXTURE_MAG_FILTER,
         glContext.LINEAR
      );

      glContext.texImage2D(
         glContext.TEXTURE_2D,
         0,
         glContext.RGBA,
         glContext.RGBA,
         glContext.UNSIGNED_BYTE,
         this.jsImage
      );

      return texture;
   }

   public loadIntoShaderProgram(
      glContext: WebGL2RenderingContext,
      shaderProgram: WebGLProgram,
      textureUnit: number
   ): void {
      glContext.activeTexture(glContext.TEXTURE0 + textureUnit);
      glContext.bindTexture(
         glContext.TEXTURE_2D,
         this.createTexture(glContext)
      );

      glContext.uniform1i(
         glContext.getUniformLocation(shaderProgram, this.uniformGlslName),
         textureUnit
      );
   }
}

abstract class GlslVariable {
   private static uniqueNumber: number = 0;

   public static getUniqueName(prefix: string): string {
      GlslVariable.uniqueNumber++;
      return prefix + "_" + GlslVariable.uniqueNumber.toString();
   }

   public static getGlslNamesOfGlslVariables(
      glslVariables: GlslVariable[]
   ): string[] {
      let glslNames: string[] = [];
      if (glslVariables !== null) {
         for (let i = 0; i < glslVariables.length; i++) {
            glslNames.push(glslVariables[i].getGlslName());
         }
      }
      return glslNames;
   }

   protected glslName: string;

   constructor(customDeclaration: string = "") {
      this.glslName = GlslVariable.getUniqueName(this.getGlslVarType());
      if (customDeclaration !== null) {
         if (customDeclaration !== "") {
            customDeclaration = " = " + customDeclaration;
         }
         GlslShader.addGlslCommandToCurrentShader(
            this.getGlslVarType() +
               " " +
               this.getGlslName() +
               customDeclaration +
               ";"
         );
      }
   }

   public getGlslName(): string {
      return this.glslName;
   }

   public abstract getGlslVarType(): GLSL_TYPE;

   public abstract addFloat(...addends: GlslFloat[]): GlslVariable;
   public abstract addVector3(...addends: GlslVector3[]): GlslVariable;
   public abstract addVector4(...addends: GlslVector4[]): GlslVariable;
   public abstract addMatrix3(...addends: GlslMatrix3[]): GlslVariable;

   public abstract subtractFloat(...subtrahends: GlslFloat[]): GlslVariable;
   public abstract subtractVector3(...subtrahends: GlslVector3[]): GlslVariable;
   public abstract subtractVector4(...subtrahends: GlslVector4[]): GlslVariable;
   public abstract subtractMatrix3(...subtrahends: GlslMatrix3[]): GlslVariable;

   public abstract multiplyFloat(...factors: GlslFloat[]): GlslVariable;
   public abstract multiplyVector3(...factors: GlslVector3[]): GlslVariable;
   public abstract multiplyVector4(...factors: GlslVector4[]): GlslVariable;
   public abstract multiplyMatrix3(...factors: GlslMatrix3[]): GlslVariable;

   public abstract divideFloat(...divisors: GlslFloat[]): GlslVariable;

   private declareGlslResult(glslOperation: GlslOperation): void {
      GlslShader.addGlslCommandToCurrentShader(glslOperation.getDeclaration());
   }

   protected getGlslFloatResult(
      operants: GlslVariable[],
      operator: GLSL_OPERATOR
   ): GlslFloat {
      const glslResult = new GlslFloat();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   protected getGlslVector3Result(
      operants: GlslVariable[],
      operator: GLSL_OPERATOR
   ): GlslVector3 {
      const glslResult = new GlslVector3();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   protected getGlslVector4Result(
      operants: GlslVariable[],
      operator: GLSL_OPERATOR
   ): GlslVector4 {
      const glslResult = new GlslVector4();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }

   protected getGlslMatrix3Result(
      operants: GlslVariable[],
      operator: GLSL_OPERATOR
   ): GlslMatrix3 {
      const glslResult = new GlslMatrix3();
      this.declareGlslResult(
         new GlslOperation(this, glslResult, operants, operator)
      );
      return glslResult;
   }
}

abstract class GlslVector extends GlslVariable {
   public abstract length(): GlslFloat;
   public abstract normalize(): GlslVector;
   public abstract maximum(...parameters: GlslVariable[]): GlslVariable;
   public abstract minimum(...parameters: GlslVariable[]): GlslVariable;

   public channel(channel: GLSL_CHANNEL): GlslFloat {
      return this.getGlslFloatResult(
         [this, new GlslInteger(channel)],
         GLSL_OPERATORS.CHANNEL
      );
   }
}

abstract class GlslMatrix extends GlslVariable {
   public abstract inverse(): GlslMatrix;
}

class GlslInteger extends GlslVariable {
   constructor(jsNumber: number = null) {
      if (jsNumber !== null) {
         super(null);
         this.glslName = jsNumber.toString();
      } else {
         super();
      }
   }

   public getGlslVarType(): GLSL_TYPE {
      return GLSL_TYPE.INT;
   }

   public addFloat(...addends: GlslFloat[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public addVector3(...addends: GlslVector3[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public addVector4(...addends: GlslVector4[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public addMatrix3(...addends: GlslMatrix3[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public subtractFloat(...subtrahends: GlslFloat[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public subtractVector3(...subtrahends: GlslVector3[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public subtractVector4(...subtrahends: GlslVector4[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public subtractMatrix3(...subtrahends: GlslMatrix3[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public multiplyFloat(...factors: GlslFloat[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public multiplyVector3(...factors: GlslVector3[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public multiplyVector4(...factors: GlslVector4[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public multiplyMatrix3(...factors: GlslMatrix3[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
   public divideFloat(...divisors: GlslFloat[]): GlslVariable {
      throw new Error("Method not implemented.");
   }
}

class GlslFloat extends GlslVariable {
   public static getJsNumberAsString(number: number): string {
      if (Math.trunc(number) === number) {
         return number.toString() + ".0";
      }
      if (number.toString().includes("e-")) {
         //console.warn(number.toString() + " is converted to zero.");
         return "0.0";
      }
      return number.toString();
   }

   constructor(jsNumber: number = null) {
      if (jsNumber !== null) {
         super(null);
         this.glslName = GlslFloat.getJsNumberAsString(jsNumber);
      } else {
         super();
      }
   }

   public getGlslName(): string {
      return this.glslName;
   }

   public getGlslVarType(): GLSL_TYPE {
      return GLSL_TYPE.FLOAT;
   }

   public addFloat(...addends: GlslFloat[]): GlslFloat {
      return this.getGlslFloatResult(addends, GLSL_OPERATORS.ADD);
   }
   public addVector3(...addends: GlslVector3[]): GlslVector3 {
      return this.getGlslVector3Result(addends, GLSL_OPERATORS.ADD);
   }
   public addVector4(...addends: GlslVector4[]): GlslVector4 {
      return this.getGlslVector4Result(addends, GLSL_OPERATORS.ADD);
   }
   public addMatrix3(...addends: GlslMatrix3[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATORS.ADD);
   }
   public subtractFloat(...subtrahends: GlslFloat[]): GlslFloat {
      return this.getGlslFloatResult(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractVector3(...subtrahends: GlslVector3[]): GlslVector3 {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractVector4(...subtrahends: GlslVector4[]): GlslVector4 {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractMatrix3(...subtrahends: GlslMatrix3[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public multiplyFloat(...factors: GlslFloat[]): GlslFloat {
      return this.getGlslFloatResult(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyVector3(...factors: GlslVector3[]): GlslVector3 {
      return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyVector4(...factors: GlslVector4[]): GlslVector4 {
      return this.getGlslVector4Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyMatrix3(...factors: GlslMatrix3[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public divideFloat(...divisors: GlslFloat[]): GlslFloat {
      return this.getGlslFloatResult(divisors, GLSL_OPERATORS.DIVIDE);
   }

   public maximum(...parameters: GlslVariable[]): GlslFloat {
      return this.getGlslFloatResult(parameters, GLSL_OPERATORS.MAXIMUM);
   }
   public minimum(...parameters: GlslVariable[]): GlslFloat {
      return this.getGlslFloatResult(parameters, GLSL_OPERATORS.MINIMUM);
   }

   public radians(): GlslFloat {
      return this.getGlslFloatResult([this], GLSL_OPERATORS.RADIANS);
   }

   public sin(): GlslFloat {
      return this.getGlslFloatResult([this], GLSL_OPERATORS.SINE);
   }
   public cos(): GlslFloat {
      return this.getGlslFloatResult([this], GLSL_OPERATORS.COSINE);
   }
}

class GlslVector3 extends GlslVector {
   constructor(vector3: [GlslFloat, GlslFloat, GlslFloat] = undefined) {
      let customDeclaration: string = "";
      if (vector3 !== undefined) {
         let vector3GlslNames: string[] = [];
         for (let i = 0; i < vector3.length; i++) {
            vector3GlslNames.push(vector3[i].getGlslName());
         }

         customDeclaration =
            GLSL_TYPE.VEC3 + "(" + vector3GlslNames.join(", ") + ")";
      }
      super(customDeclaration);
   }

   public getGlslVarType(): GLSL_TYPE {
      return GLSL_TYPE.VEC3;
   }

   public addFloat(...addends: GlslFloat[]): GlslVector3 {
      return this.getGlslVector3Result(addends, GLSL_OPERATORS.ADD);
   }
   public addVector3(...addends: GlslVector3[]): GlslVector3 {
      return this.getGlslVector3Result(addends, GLSL_OPERATORS.ADD);
   }
   public addVector4(...addends: GlslVector4[]): undefined {
      throw new Error("Not possible to add vec4 to vec3.");
   }
   public addMatrix3(...addends: GlslMatrix3[]): undefined {
      throw new Error("Not possible to add mat3 to vec3.");
   }
   public subtractFloat(...subtrahends: GlslFloat[]): GlslVector3 {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractVector3(...subtrahends: GlslVector3[]): GlslVector3 {
      return this.getGlslVector3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractVector4(...subtrahends: GlslVector4[]): undefined {
      throw new Error("Not possible to subtract vec4 from vec3.");
   }
   public subtractMatrix3(...subtrahends: GlslMatrix3[]): undefined {
      throw new Error("Not possible to subtract mat3 from vec3.");
   }
   public multiplyFloat(...factors: GlslFloat[]): GlslVector3 {
      return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyVector3(...factors: GlslVector3[]): GlslVector3 {
      return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyVector4(...factors: GlslVector4[]): undefined {
      throw new Error("Not possible to multiply vec4 with vec3.");
   }
   public multiplyMatrix3(...factors: GlslMatrix3[]): GlslVector3 {
      return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public divideFloat(...divisors: GlslFloat[]): GlslVector3 {
      return this.getGlslVector3Result(divisors, GLSL_OPERATORS.DIVIDE);
   }

   public length(): GlslFloat {
      return this.getGlslFloatResult([this], GLSL_OPERATORS.LENGTH);
   }
   public normalize(): GlslVector3 {
      return this.getGlslVector3Result([this], GLSL_OPERATORS.NORMALIZE);
   }
   public maximum(...parameters: GlslVariable[]): GlslVector3 {
      return this.getGlslVector3Result(parameters, GLSL_OPERATORS.MAXIMUM);
   }
   public minimum(...parameters: GlslVariable[]): GlslVector3 {
      return this.getGlslVector3Result(parameters, GLSL_OPERATORS.MINIMUM);
   }

   public getVector4(fourthChannel: GlslFloat = new GlslFloat(1)): GlslVector4 {
      return this.getGlslVector4Result(
         [this, fourthChannel],
         GLSL_OPERATORS.VEC3_TO_VEC4
      );
   }
}

class GlslVector4 extends GlslVector {
   constructor(
      vector4: [GlslFloat, GlslFloat, GlslFloat, GlslFloat] = undefined,
      customDeclaration: string = ""
   ) {
      if (customDeclaration === "") {
         if (vector4 !== undefined && vector4 !== null) {
            let vector4GlslNames: string[] = [];
            for (let i = 0; i < vector4.length; i++) {
               vector4GlslNames.push(vector4[i].getGlslName());
            }

            customDeclaration =
               GLSL_TYPE.VEC4 + "(" + vector4GlslNames.join(", ") + ")";
         }
      }
      super(customDeclaration);
   }

   public getGlslVarType(): GLSL_TYPE {
      return GLSL_TYPE.VEC4;
   }
   public addFloat(...addends: GlslFloat[]): GlslVector4 {
      return this.getGlslVector4Result(addends, GLSL_OPERATORS.ADD);
   }
   public addVector3(...addends: GlslVector3[]): undefined {
      throw new Error("Not possible to add vec3 to vec4.");
   }
   public addVector4(...addends: GlslVector4[]): GlslVector4 {
      return this.getGlslVector4Result(addends, GLSL_OPERATORS.ADD);
   }
   public addMatrix3(...addends: GlslMatrix3[]): undefined {
      throw new Error("Not possible to add mat3 to vec4.");
   }
   public subtractFloat(...subtrahends: GlslFloat[]): GlslVector4 {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractVector3(...subtrahends: GlslVector3[]): undefined {
      throw new Error("Not possible to subtract vec3 from vec4.");
   }
   public subtractVector4(...subtrahends: GlslVector4[]): GlslVector4 {
      return this.getGlslVector4Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractMatrix3(...subtrahends: GlslMatrix3[]): undefined {
      throw new Error("Not possible to subtract mat3 from vec4.");
   }
   public multiplyFloat(...factors: GlslFloat[]): GlslVector4 {
      return this.getGlslVector4Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyVector3(...factors: GlslVector3[]): undefined {
      throw new Error("Not possible to multiply vec3 with vec4.");
   }
   public multiplyVector4(...factors: GlslVector4[]): GlslVector4 {
      return this.getGlslVector4Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyMatrix3(...factors: GlslMatrix3[]): undefined {
      throw new Error("Not possible to multiply mat3 with vec4.");
   }
   public divideFloat(...divisors: GlslFloat[]): GlslVector4 {
      return this.getGlslVector4Result(divisors, GLSL_OPERATORS.DIVIDE);
   }

   public length(): GlslFloat {
      return this.getGlslFloatResult([this], GLSL_OPERATORS.LENGTH);
   }
   public normalize(): GlslVector4 {
      return this.getGlslVector4Result([this], GLSL_OPERATORS.NORMALIZE);
   }
   public maximum(...parameters: GlslVariable[]): GlslVector4 {
      return this.getGlslVector4Result(parameters, GLSL_OPERATORS.MAXIMUM);
   }
   public minimum(...parameters: GlslVariable[]): GlslVector4 {
      return this.getGlslVector4Result(parameters, GLSL_OPERATORS.MINIMUM);
   }

   public getLuminanceFloat(): GlslFloat {
      return this.getGlslFloatResult([this], GLSL_OPERATORS.LUMINANCE);
   }
}

class GlslMatrix3 extends GlslMatrix {
   /*public matrix3: [
      [GlslFloat, GlslFloat, GlslFloat],
      [GlslFloat, GlslFloat, GlslFloat],
      [GlslFloat, GlslFloat, GlslFloat]
   ];*/

   constructor(
      matrix3: [
         [GlslFloat, GlslFloat, GlslFloat],
         [GlslFloat, GlslFloat, GlslFloat],
         [GlslFloat, GlslFloat, GlslFloat]
      ] = undefined
   ) {
      let customDeclaration: string = "";
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
               GLSL_TYPE.MAT3 +
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

   public getGlslVarType(): GLSL_TYPE {
      return GLSL_TYPE.MAT3;
   }

   public addFloat(...addends: GlslFloat[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATORS.ADD);
   }
   public addVector3(...addends: GlslVector3[]): undefined {
      throw new Error("Not possible to add vec3 to mat3.");
   }
   public addVector4(...addends: GlslVector4[]): undefined {
      throw new Error("Not possible to add vec4 to mat3.");
   }
   public addMatrix3(...addends: GlslMatrix3[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(addends, GLSL_OPERATORS.ADD);
   }
   public subtractFloat(...subtrahends: GlslFloat[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public subtractVector3(...subtrahends: GlslVector3[]): undefined {
      throw new Error("Not possible to subtract vec3 from mat3.");
   }
   public subtractVector4(...subtrahends: GlslVector4[]): undefined {
      throw new Error("Not possible to subtract vec4 from mat3.");
   }
   public subtractMatrix3(...subtrahends: GlslMatrix3[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(subtrahends, GLSL_OPERATORS.SUBTRACT);
   }
   public multiplyFloat(...factors: GlslFloat[]): GlslVariable {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyVector3(...factors: GlslVector3[]): GlslVector3 {
      return this.getGlslVector3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public multiplyVector4(...factors: GlslVector4[]): undefined {
      throw new Error("Not possible to multiply vec4 with mat3.");
   }
   public multiplyMatrix3(...factors: GlslMatrix3[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(factors, GLSL_OPERATORS.MULTIPLY);
   }
   public divideFloat(...divisors: GlslFloat[]): GlslMatrix3 {
      return this.getGlslMatrix3Result(divisors, GLSL_OPERATORS.DIVIDE);
   }

   public inverse(): GlslMatrix3 {
      return this.getGlslMatrix3Result([this], GLSL_OPERATORS.INVERSE);
   }
}
