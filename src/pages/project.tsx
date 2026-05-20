import { Link, useRoute } from "wouter"
import { ArrowLeft, ArrowUpRight, BookOpen, Code2 } from "lucide-react"
import { PageShell } from "../components/page-shell"
import { Section } from "../components/section"
import { findProject } from "../data/projects"

export function ProjectPage() {
  const [, params] = useRoute("/open-source/:slug")
  const project = params?.slug ? findProject(params.slug) : undefined

  if (!project) {
    return (
      <PageShell eyebrow="Not found" title="Project missing">
        <Section>
          <div className="max-w-2xl mx-auto text-center">
            <Link
              href="/open-source"
              className="inline-flex items-center gap-sm text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Open Source
            </Link>
          </div>
        </Section>
      </PageShell>
    )
  }

  return (
    <PageShell
      eyebrow={project.tagline}
      title={project.name}
      lead={project.longDescription || project.description}
    >
      {/* Quick actions: GitHub + Docs + License chip */}
      <Section>
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-xl">
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-sm text-primary hover:text-accent transition-colors"
            >
              <Code2 className="w-4 h-4" /> GitHub <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
          {project.docs && (
            <a
              href={project.docs}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-sm text-primary hover:text-accent transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Documentation <ArrowUpRight className="w-4 h-4" />
            </a>
          )}
          {project.license && (
            <span className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-secondary">
              {project.license}
            </span>
          )}
        </div>
      </Section>

      {project.highlights && (
        <Section eyebrow="Features">
          <ul className="max-w-2xl mx-auto flex flex-col divide-y divide-border-subtle">
            {project.highlights.map((h) => (
              <li
                key={h}
                className="py-lg text-secondary text-base md:text-lg leading-relaxed text-center"
              >
                {h}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section>
        <div className="text-center">
          <Link
            href="/open-source"
            className="inline-flex items-center gap-sm text-xs font-sans font-bold uppercase tracking-[0.25em] text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All projects
          </Link>
        </div>
      </Section>
    </PageShell>
  )
}
