// Vendored from @paper-design/shaders/dist/get-shader-color-from-string.js
// Parses CSS color strings into [r, g, b, a] in 0..1.

type RGBA = [number, number, number, number]

const FALLBACK: RGBA = [0, 0, 0, 1]
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

function hexToRgba(hex: string): RGBA {
  hex = hex.replace(/^#/, "")
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("")
  if (hex.length === 6) hex = hex + "ff"
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
    parseInt(hex.slice(6, 8), 16) / 255,
  ]
}

function parseRgba(s: string): RGBA {
  const m = s.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/i)
  if (!m) return [0, 0, 0, 1]
  return [
    parseInt(m[1] ?? "0") / 255,
    parseInt(m[2] ?? "0") / 255,
    parseInt(m[3] ?? "0") / 255,
    m[4] === undefined ? 1 : parseFloat(m[4]),
  ]
}

function parseHsla(s: string): [number, number, number, number] {
  const m = s.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([0-9.]+))?\s*\)$/i)
  if (!m) return [0, 0, 0, 1]
  return [
    parseInt(m[1] ?? "0"),
    parseInt(m[2] ?? "0"),
    parseInt(m[3] ?? "0"),
    m[4] === undefined ? 1 : parseFloat(m[4]),
  ]
}

function hslaToRgba([h, s, l, a]: [number, number, number, number]): RGBA {
  const H = h / 360
  const S = s / 100
  const L = l / 100
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = L
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = L < 0.5 ? L * (1 + S) : L + S - L * S
    const p = 2 * L - q
    r = hue2rgb(p, q, H + 1 / 3)
    g = hue2rgb(p, q, H)
    b = hue2rgb(p, q, H - 1 / 3)
  }
  return [r, g, b, a]
}

export function parseColor(input: string | number[]): RGBA {
  if (Array.isArray(input)) {
    if (input.length === 4) return input as RGBA
    if (input.length === 3) return [input[0]!, input[1]!, input[2]!, 1]
    return FALLBACK
  }
  if (typeof input !== "string") return FALLBACK
  let rgba: RGBA
  if (input.startsWith("#")) rgba = hexToRgba(input)
  else if (input.startsWith("rgb")) rgba = parseRgba(input)
  else if (input.startsWith("hsl")) rgba = hslaToRgba(parseHsla(input))
  else return FALLBACK
  return [clamp(rgba[0], 0, 1), clamp(rgba[1], 0, 1), clamp(rgba[2], 0, 1), clamp(rgba[3], 0, 1)]
}
