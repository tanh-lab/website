import { useEffect, useRef } from "react"
import { parseColor } from "./gradient/color"
import { createRenderer, type Renderer, type RendererConfig } from "./gradient/renderer"

const FPS_CAP = 30

const COLORS = [
  "hsl(193, 85%, 66%)",
  "hsl(196, 100%, 83%)",
  "hsl(195, 100%, 50%)",
]
const COLOR_BACK = "hsl(0, 0%, 0%)"

const SHAPE_CORNERS = 4
const FIT_CONTAIN = 1

function buildConfig(width: number, height: number, pixelRatio: number): RendererConfig {
  return {
    width,
    height,
    pixelRatio,
    noiseUrl: "/shader-noise.png",
    speed: 1,
    colorBack: parseColor(COLOR_BACK),
    colors: COLORS.map(parseColor),
    softness: 0.76,
    intensity: 0.45,
    noise: 0,
    shape: SHAPE_CORNERS,
    fit: FIT_CONTAIN,
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
    fps: FPS_CAP,
  }
}

// `transferControlToOffscreen()` is a one-shot, irreversible operation per
// canvas. Owning the worker/renderer outside React keeps StrictMode's double-
// mount from re-transferring the canvas, and gives us a stable handle to post
// resize/visibility updates from any later mount.
type Driver =
  | { kind: "worker"; worker: Worker }
  | { kind: "main"; renderer: Renderer }

let driver: Driver | null = null
let ownedCanvas: HTMLCanvasElement | null = null

function getOrCreateDriver(canvas: HTMLCanvasElement): Driver | null {
  if (driver && ownedCanvas === canvas) return driver
  if (driver) return driver // canvas changed mid-session; reuse driver anyway

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  const initWidth = Math.max(1, rect.width || window.innerWidth)
  const initHeight = Math.max(1, rect.height || window.innerHeight)
  const config = buildConfig(initWidth, initHeight, dpr)

  // Preferred path: render in a worker against an OffscreenCanvas.
  if (typeof canvas.transferControlToOffscreen === "function") {
    const offscreen = canvas.transferControlToOffscreen()
    // Worker is pre-built (see `build:worker` script) so the same URL works in
    // dev (served from public/) and production (emitted to dist/). Bun's dev
    // server resolves `new URL(..., import.meta.url)` to a file:// path which
    // browsers refuse to load as a Worker — hence the fixed path.
    const worker = new Worker("/gradient-worker.js", { type: "module" })
    worker.postMessage({ type: "init", canvas: offscreen, ...config }, [offscreen])
    driver = { kind: "worker", worker }
    ownedCanvas = canvas
    return driver
  }

  // Fallback for browsers without OffscreenCanvas support (e.g. Firefox on
  // Android): run the same GL renderer on the main thread.
  try {
    const renderer = createRenderer(canvas, config, (cb) => requestAnimationFrame(cb))
    driver = { kind: "main", renderer }
    ownedCanvas = canvas
    return driver
  } catch (e) {
    console.error("Main-thread gradient renderer init failed", e)
    return null
  }
}

export function GradientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const d = getOrCreateDriver(canvas)
    if (!d) return // No WebGL2 at all — canvas stays black.

    const postResize = (width: number, height: number, pixelRatio: number) => {
      if (d.kind === "worker") {
        d.worker.postMessage({ type: "resize", width, height, pixelRatio })
      } else {
        d.renderer.resize(width, height, pixelRatio)
      }
    }
    const postVisibility = (visible: boolean) => {
      if (d.kind === "worker") {
        d.worker.postMessage({ type: "visibility", visible })
      } else {
        d.renderer.setVisible(visible)
      }
    }

    const ro = new ResizeObserver((entries) => {
      const e = entries[0]
      if (!e) return
      const cr = e.contentRect
      postResize(
        Math.max(1, cr.width),
        Math.max(1, cr.height),
        Math.min(window.devicePixelRatio || 1, 2),
      )
    })
    ro.observe(canvas)

    const onVisibility = () => postVisibility(!document.hidden)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      ro.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      // Driver outlives the component on purpose — see comment at module top.
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100lvh",
        zIndex: -10,
        display: "block",
        background: "#000",
      }}
    />
  )
}
