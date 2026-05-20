import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type GlassCardProps = {
  children: ReactNode
  className?: string
  hoverable?: boolean
}

export function GlassCard({ children, className, hoverable = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-panel rounded-3xl p-jumbo relative overflow-hidden group",
        hoverable && "transition-transform duration-300 hover:-translate-y-1",
        className,
      )}
    >
      {hoverable && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
