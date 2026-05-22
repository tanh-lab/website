import { GrainGradient } from "@paper-design/shaders-react"

export function GradientBackground() {
  return (
    <div
      className="fixed inset-x-0 top-0 -z-10"
      style={{ height: "100lvh" }}
    >
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        minPixelRatio={1}
        maxPixelCount={1920 * 1080}
        colorBack="hsl(0, 0%, 0%)"
        softness={0.76}
        intensity={0.45}
        noise={0}
        shape="corners"
        offsetX={0}
        offsetY={0}
        scale={1}
        rotation={0}
        speed={1}
        colors={["hsl(193, 85%, 66%)", "hsl(196, 100%, 83%)", "hsl(195, 100%, 50%)"]}
      />
    </div>
  )
}
