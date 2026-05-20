import { Link } from "wouter"
import { Code2, ArrowUpRight } from "lucide-react"
import { PageShell } from "../components/page-shell"
import { Section } from "../components/section"
import { projects } from "../data/projects"

export function OpenSourcePage() {
  return (
    <PageShell
      eyebrow="Philosophy"
      title="Open Source"
      lead="We believe in building in the open. Our in-house libraries and tools live on GitHub for the community to use, fork, and improve."
    >
      <Section eyebrow="Code we share">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-massive max-w-5xl mx-auto">
          {projects.map((p) => (
            <Link
              key={p.slug}
              href={`/open-source/${p.slug}`}
              className="group flex flex-col items-center text-center"
            >
              <Code2 className="w-8 h-8 text-primary mb-xl" />
              <div className="flex items-center gap-sm mb-md">
                <h3 className="font-display text-primary text-2xl md:text-3xl group-hover:text-accent transition-colors">
                  {p.name}
                </h3>
                <ArrowUpRight className="w-4 h-4 text-secondary group-hover:text-accent transition-colors" />
              </div>
              <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-secondary mb-md">
                {p.tagline}
              </p>
              <p className="text-secondary leading-relaxed text-balance">
                {p.description}
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </PageShell>
  )
}
