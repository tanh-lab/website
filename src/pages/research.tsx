import { publications } from "@/data/publications";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";
import { Page } from "@/ui/page";

/**
 * The one page that breaks the lead-then-rows shape the others share.
 *
 * The papers run across rather than down, each under its own first page. Three
 * fit the width comfortably, and reading them as a row rather than a list makes
 * the section a body of work instead of a changelog.
 *
 * Each carries a plain-language summary as well as its citation: a title alone
 * tells a visitor outside the field nothing, and the whole point of showing
 * research on a studio site is that someone who is not a researcher can see
 * what it was for.
 */
export function ResearchPage() {
    const { ref, isVisible } = useReveal<HTMLOListElement>();

    return (
        <Page id="research" title="Research">
            <div className="research-head">
                <p className="lead">
                    We work at the intersection of audio software, machine learning and
                    instrument design. We conduct applied research for clients, and
                    translate findings into shipped products.
                </p>

                {/*
                    Origin and direction, and nothing else. Successive drafts
                    here either repeated the lead outright ("applied research",
                    "shipped products") or asserted a feeling about research,
                    which reads as advertising however calmly it is phrased. The
                    label stays a plain section marker: anything more specific
                    ended up restating the sentence beneath it.
                */}
                <div className="research-aside">
                    <h3>Background</h3>
                    <p>
                        Our roots lie in research, and we are always looking for new
                        problems to solve.
                    </p>
                </div>
            </div>

            <ol ref={ref} className={cn("papers", "fade", isVisible && "is-in")}>
                {publications.map((publication) => (
                    <li className="paper" key={publication.title}>
                        {/*
                            The slot is held even when there is no cover, so the
                            three columns stay level. A short column reads as a
                            mistake; an empty slot reads as "no preview".
                        */}
                        <div className="paper-cover" aria-hidden="true">
                            {publication.cover ? (
                                <img
                                    src={publication.cover}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : null}
                        </div>

                        <h3 className="paper-title">
                            <a
                                href={publication.links[0]?.href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {publication.title}
                                <span className="paper-arrow" aria-hidden="true">
                                    &#8599;
                                </span>
                            </a>
                        </h3>

                        <p className="paper-summary">{publication.summary}</p>

                        <p className="paper-venue">{publication.venue}</p>
                        <p className="paper-authors">{publication.authors}</p>

                        <p className="paper-links">
                            {publication.links.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </p>
                    </li>
                ))}
            </ol>
        </Page>
    );
}
