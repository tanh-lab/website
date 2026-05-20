import { PageShell } from "../components/page-shell"
import { Section } from "../components/section"
import { Brain, Sliders, Boxes, Wrench } from "lucide-react"

const services = [
  {
    icon: Brain,
    title: "Neural Audio Processing",
    description:
      "ML-based audio tools — from generative synthesis to intelligent processing. State-of-the-art models, made musical and performant.",
  },
  {
    icon: Sliders,
    title: "Plugin Development",
    description:
      "VST3, AU, and CLAP plugins built in modern C++/JUCE. Cross-platform, optimized, and DAW-tested.",
  },
  {
    icon: Boxes,
    title: "Interface & Instrument Design",
    description:
      "Interfaces that feel like instruments, not control panels. We design the experience as carefully as the engine.",
  },
  {
    icon: Wrench,
    title: "Research & Consulting",
    description:
      "Applied audio research for studios and artists. Prototyping, technical strategy, and bespoke tooling.",
  },
]

export function ServicesPage() {
  return (
    <PageShell
      eyebrow="What we do"
      title="Services"
      lead="We build modern, intuitive tools for music producers — combining state-of-the-art methods with novel ideas in interface design, neural processing, and conceptual thinking."
    >
      <Section eyebrow="Our expertise">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-massive max-w-5xl mx-auto">
          {services.map((s) => (
            <div key={s.title} className="flex flex-col items-center text-center">
              <s.icon className="w-8 h-8 text-primary mb-xl" />
              <h3 className="font-display text-primary text-2xl md:text-3xl mb-md text-balance">
                {s.title}
              </h3>
              <p className="text-secondary leading-relaxed text-balance">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </Section>
    </PageShell>
  )
}
