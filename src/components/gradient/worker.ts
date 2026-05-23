/// <reference lib="webworker" />
import { createRenderer, type Renderer, type RendererConfig, type RGBA } from "./renderer"

type InitMsg = { type: "init"; canvas: OffscreenCanvas } & RendererConfig
type ResizeMsg = { type: "resize"; width: number; height: number; pixelRatio: number }
type VisibilityMsg = { type: "visibility"; visible: boolean }
type Msg = InitMsg | ResizeMsg | VisibilityMsg

const scope = self as unknown as DedicatedWorkerGlobalScope
let renderer: Renderer | null = null

self.onmessage = (ev: MessageEvent<Msg>) => {
  const data = ev.data
  if (data.type === "init") {
    const { canvas, type: _t, ...config } = data
    try {
      renderer = createRenderer(canvas, config, (cb) => scope.requestAnimationFrame(cb))
    } catch (e) {
      console.error("worker renderer init failed", e)
    }
  } else if (data.type === "resize") {
    renderer?.resize(data.width, data.height, data.pixelRatio)
  } else if (data.type === "visibility") {
    renderer?.setVisible(data.visible)
  }
}

// Silence unused warnings for type-only imports in some bundler configs.
export type { RGBA }
