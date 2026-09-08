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
        <Page id="research">
            <div className="research-head">
                <p className="lead">
                    We work at the intersection of audio software, machine learning and
                    instrument design. We conduct applied research for clients, and
                    translate findings into shipped products.
                </p>

                {/*
                    The one thing a visitor cannot infer from a publication list.
                    Set above the lead because it is the page's single claim on
                    the reader, not because it is raising its voice.
                */}
                <div className="research-aside">
                    <h3>Custom &amp; collaborative R&amp;D</h3>
                    <p>
                        We work alongside companies as an integrated research partner
                        &mdash; from the first feasibility study to state of the art
                        running in real time, on device.
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
