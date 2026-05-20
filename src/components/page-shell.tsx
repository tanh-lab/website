import type { ReactNode } from "react"

type PageShellProps = {
  title?: string
  eyebrow?: string
  lead?: string
  children?: ReactNode
}

/**
 * Page hero: a glass panel matching the navbar pill's max width, holding
 * the page eyebrow + title + optional lead. Sections render as siblings below.
 */
export function PageShell({ title, eyebrow, lead, children }: PageShellProps) {
  return (
    <>
      <header className="relative pt-massive pb-jumbo px-xl">
        <div className="max-w-3xl mx-auto mt-massive flex flex-col items-center text-center">
          {title && (
            <h1 className="font-display text-primary text-4xl md:text-6xl leading-[1.05] tracking-tight mb-jumbo text-balance">
              {title}
            </h1>
          )}
          {eyebrow && (
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-jumbo">
              {eyebrow}
            </p>
          )}
          {lead && (
            <p className="font-sans text-secondary text-base md:text-xl leading-relaxed text-balance">
              {lead}
            </p>
          )}
        </div>
      </header>
      {children}
    </>
  )
}
