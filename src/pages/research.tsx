import { PageShell } from "../components/page-shell"
import { Section } from "../components/section"
import { ArrowUpRight } from "lucide-react"

const publications = [
  {
    title: "Pitch-Conditioned Instrument Sound Synthesis From an Interactive Timbre Latent Space",
    authors: "Christian Limberg, Fares Schulz, Zhe Zhang, Stefan Weinzierl",
    venue: "DAFx 2025 · 28th Int. Conf. on Digital Audio Effects",
    href: "https://arxiv.org/abs/2510.04339",
  },
  {
    title: "ANIRA: An Architecture for Neural Network Inference in Real-Time Audio Applications",
    authors: "Valentin Ackva, Fares Schulz",
    venue: "IS² 2024 · 5th IEEE Int. Symposium on the Internet of Sounds",
    href: "https://arxiv.org/abs/2506.12665",
  },
]

export function ResearchPage() {
  return (
    <PageShell
      eyebrow="Applied audio research"
      title="Research"
      lead="Our work sits at the intersection of audio software, machine learning, and instrument design. We conduct applied research for clients and translate findings into shipped products."
    >
      <Section eyebrow="Publications">
        <div className="max-w-3xl mx-auto flex flex-col divide-y divide-border-subtle">
          {publications.map((p) => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start justify-between gap-xl py-jumbo first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-secondary mb-md">
                  {p.venue}
                </p>
                <h3 className="font-sans font-semibold text-primary/80 text-lg md:text-xl leading-snug mb-md text-balance group-hover:text-accent transition-colors">
                  {p.title}
                </h3>
                <p className="text-secondary text-sm">{p.authors}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 mt-1 text-secondary group-hover:text-primary transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      </Section>
    </PageShell>
  )
}
