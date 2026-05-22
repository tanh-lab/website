/// <reference lib="webworker" />
import { grainGradientFragmentShader, vertexShaderSource, MAX_COLORS } from "./shaders"

type RGBA = [number, number, number, number]

type InitMsg = {
  type: "init"
  canvas: OffscreenCanvas
  width: number
  height: number
  pixelRatio: number
  noiseUrl: string
  speed: number
  colorBack: RGBA
  colors: RGBA[]
  softness: number
  intensity: number
  noise: number
  shape: number
  fit: number
  scale: number
  rotation: number
  offsetX: number
  offsetY: number
  originX: number
  originY: number
  worldWidth: number
  worldHeight: number
  fps: number
}

type ResizeMsg = { type: "resize"; width: number; height: number; pixelRatio: number }
type VisibilityMsg = { type: "visibility"; visible: boolean }
type Msg = InitMsg | ResizeMsg | VisibilityMsg

const scope = self as unknown as DedicatedWorkerGlobalScope

let config: InitMsg | null = null
let canvas: OffscreenCanvas | null = null
let gl: WebGL2RenderingContext | null = null
let program: WebGLProgram | null = null
let noiseBitmap: ImageBitmap | null = null
const uniforms: Record<string, WebGLUniformLocation | null> = {}
let lastWidthCss = 0
let lastHeightCss = 0
let lastDpr = 1
let startTime = 0
let lastFrameTime = 0
let frameIntervalMs = 1000 / 30
let visible = true

function compileShader(src: string, type: number): WebGLShader {
  const sh = gl!.createShader(type)!
  gl!.shaderSource(sh, src)
  gl!.compileShader(sh)
  if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
    const log = gl!.getShaderInfoLog(sh)
    gl!.deleteShader(sh)
    throw new Error(`Shader compile failed: ${log}`)
  }
  return sh
}

function createProgram(): WebGLProgram {
  const vs = compileShader(vertexShaderSource, gl!.VERTEX_SHADER)
  const fs = compileShader(grainGradientFragmentShader, gl!.FRAGMENT_SHADER)
  const p = gl!.createProgram()!
  gl!.attachShader(p, vs)
  gl!.attachShader(p, fs)
  gl!.linkProgram(p)
  if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
    const log = gl!.getProgramInfoLog(p)
    throw new Error(`Program link failed: ${log}`)
  }
  return p
}

function applySize(cssWidth: number, cssHeight: number, dpr: number) {
  if (!canvas || !gl) return
  const MAX = 1920 * 1080
  const target = cssWidth * cssHeight * dpr * dpr
  const scaleFactor = target > MAX ? Math.sqrt(MAX / target) : 1
  const w = Math.max(1, Math.round(cssWidth * dpr * scaleFactor))
  const h = Math.max(1, Math.round(cssHeight * dpr * scaleFactor))
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  gl.viewport(0, 0, w, h)
  if (uniforms.u_resolution) gl.uniform2f(uniforms.u_resolution, w, h)
  if (uniforms.u_pixelRatio) gl.uniform1f(uniforms.u_pixelRatio, dpr * scaleFactor)
}

function setupGL() {
  if (!canvas || !config) return
  gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "low-power",
  }) as WebGL2RenderingContext | null
  if (!gl) throw new Error("WebGL2 unavailable")

  program = createProgram()
  gl.useProgram(program)

  const vbo = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const names = [
    "u_time", "u_resolution", "u_pixelRatio", "u_noiseTexture",
    "u_colorBack", "u_colors[0]", "u_colorsCount",
    "u_softness", "u_intensity", "u_noise", "u_shape",
    "u_originX", "u_originY", "u_worldWidth", "u_worldHeight", "u_fit",
    "u_scale", "u_rotation", "u_offsetX", "u_offsetY",
    "u_imageAspectRatio",
  ]
  for (const n of names) uniforms[n] = gl.getUniformLocation(program, n)

  gl.uniform4fv(uniforms.u_colorBack!, config.colorBack)
  const colorsFlat = new Float32Array(MAX_COLORS * 4)
  for (let i = 0; i < Math.min(config.colors.length, MAX_COLORS); i++) {
    colorsFlat.set(config.colors[i]!, i * 4)
  }
  gl.uniform4fv(uniforms["u_colors[0]"]!, colorsFlat)
  gl.uniform1f(uniforms.u_colorsCount!, config.colors.length)
  gl.uniform1f(uniforms.u_softness!, config.softness)
  gl.uniform1f(uniforms.u_intensity!, config.intensity)
  gl.uniform1f(uniforms.u_noise!, config.noise)
  gl.uniform1f(uniforms.u_shape!, config.shape)
  gl.uniform1f(uniforms.u_originX!, config.originX)
  gl.uniform1f(uniforms.u_originY!, config.originY)
  gl.uniform1f(uniforms.u_worldWidth!, config.worldWidth)
  gl.uniform1f(uniforms.u_worldHeight!, config.worldHeight)
  gl.uniform1f(uniforms.u_fit!, config.fit)
  gl.uniform1f(uniforms.u_scale!, config.scale)
  gl.uniform1f(uniforms.u_rotation!, config.rotation)
  gl.uniform1f(uniforms.u_offsetX!, config.offsetX)
  gl.uniform1f(uniforms.u_offsetY!, config.offsetY)
  gl.uniform1f(uniforms.u_imageAspectRatio!, 1)

  const tex = gl.createTexture()!
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, tex)
  if (noiseBitmap) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noiseBitmap)
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255]),
    )
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.uniform1i(uniforms.u_noiseTexture!, 0)

  applySize(lastWidthCss, lastHeightCss, lastDpr)
}

async function init(msg: InitMsg) {
  config = msg
  canvas = msg.canvas
  lastWidthCss = msg.width
  lastHeightCss = msg.height
  lastDpr = msg.pixelRatio
  frameIntervalMs = 1000 / Math.max(1, msg.fps)

  // OffscreenCanvas dispatches the same context-loss events as HTMLCanvasElement.
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault()
    gl = null
    program = null
  })
  canvas.addEventListener("webglcontextrestored", () => {
    try {
      setupGL()
    } catch (err) {
      console.error("WebGL restore failed", err)
    }
  })

  setupGL()
  startTime = performance.now()
  lastFrameTime = 0
  scope.requestAnimationFrame(render)

  try {
    const res = await fetch(msg.noiseUrl)
    const blob = await res.blob()
    noiseBitmap = await createImageBitmap(blob)
    if (gl && !gl.isContextLost()) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noiseBitmap)
    }
  } catch (e) {
    console.error("Noise texture load failed", e)
  }
}

function render(now: number) {
  scope.requestAnimationFrame(render)
  if (!visible || !gl || !program || !config || gl.isContextLost()) return
  if (now - lastFrameTime < frameIntervalMs) return
  lastFrameTime = now
  const elapsed = ((now - startTime) / 1000) * config.speed
  gl.uniform1f(uniforms.u_time!, elapsed)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

self.onmessage = (ev: MessageEvent<Msg>) => {
  const data = ev.data
  if (data.type === "init") {
    init(data).catch((e) => console.error("worker init failed", e))
  } else if (data.type === "resize") {
    lastWidthCss = data.width
    lastHeightCss = data.height
    lastDpr = data.pixelRatio
    applySize(data.width, data.height, data.pixelRatio)
  } else if (data.type === "visibility") {
    visible = data.visible
  }
}
