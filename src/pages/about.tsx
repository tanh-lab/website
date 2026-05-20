import { PageShell } from "../components/page-shell"
import { Section } from "../components/section"
import { GithubIcon, LinkedinIcon, OrcidIcon } from "../components/brand-icons"

type Member = {
  name: string
  linkedin: string
  github: string
  orcid: string
}

const founders: Member[] = [
  {
    name: "Valentin Ackva",
    linkedin: "https://www.linkedin.com/in/valentin-ackva/",
    github: "https://github.com/vackva",
    orcid: "https://orcid.org/0009-0006-7300-6253",
  },
  {
    name: "Fares Schulz",
    linkedin: "https://www.linkedin.com/in/fares-schulz-850a79270/",
    github: "https://github.com/faressc",
    orcid: "https://orcid.org/0009-0003-3512-0096",
  },
]

const contributors: Member[] = [
  {
    name: "Rodrigo Diaz",
    linkedin: "https://www.linkedin.com/in/rodrigodzf/",
    github: "https://github.com/rodrigodzf",
    orcid: "https://orcid.org/0009-0009-0862-2967",
  },
]

function MemberCard({ m }: { m: Member }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h3 className="font-display text-primary text-2xl md:text-3xl mb-xl">
        {m.name}
      </h3>
      <div className="flex items-center gap-xl text-secondary">
        <a
          href={m.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${m.name} on LinkedIn`}
          className="hover:text-primary transition-colors"
        >
          <LinkedinIcon className="w-5 h-5" />
        </a>
        <a
          href={m.github}
          target="_blank"
          rel="noreferrer"
          aria-label={`${m.name} on GitHub`}
          className="hover:text-primary transition-colors"
        >
          <GithubIcon className="w-5 h-5" />
        </a>
        <a
          href={m.orcid}
          target="_blank"
          rel="noreferrer"
          aria-label={`${m.name} on ORCID`}
          className="hover:text-primary transition-colors"
        >
          <OrcidIcon className="w-5 h-5" />
        </a>
      </div>
    </div>
  )
}

export function AboutPage() {
  return (
    <PageShell
      eyebrow="Berlin · audio software studio"
      title="About"
      lead="tanh lab is an audio software studio based in Berlin, founded by Fares Schulz and Valentin Ackva. We develop innovative tools for modern music production."
    >
      <Section eyebrow="The team">
        <div className="max-w-3xl mx-auto flex flex-col gap-massive">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-massive">
            {founders.map((m) => (
              <MemberCard key={m.name} m={m} />
            ))}
          </div>
          <div className="flex flex-col items-center gap-massive">
            {contributors.map((m) => (
              <MemberCard key={m.name} m={m} />
            ))}
          </div>
        </div>
      </Section>
    </PageShell>
  )
}
