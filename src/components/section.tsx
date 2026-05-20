import type { ReactNode } from "react"

type SectionProps = {
  id?: string
  eyebrow?: string
  title?: string
  lead?: string
  children: ReactNode
}

/**
 * Free-flowing content section with optional title block. Matches the inspo
 * layout: large heading, accent bar, then content (typically a card grid).
 */
export function Section({ id, eyebrow, title, lead, children }: SectionProps) {
  return (
    <section id={id} className="relative py-jumbo md:py-massive scroll-mt-massive">
      <div className="max-w-7xl mx-auto px-xl">
        {(eyebrow || title || lead) && (
          <div className="mb-jumbo md:mb-massive max-w-3xl mx-auto flex flex-col items-center text-center">
            {eyebrow && (
              <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-jumbo">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display text-primary text-3xl md:text-5xl leading-[1.05] tracking-tight mb-xl text-balance">
                {title}
              </h2>
            )}
            {lead && (
              <p className="font-sans text-secondary text-base md:text-lg leading-relaxed text-balance">
                {lead}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  )
}
