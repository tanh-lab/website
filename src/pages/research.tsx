import { publications } from "@/data/publications";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";
import { ExternalLink } from "@/ui/external-link";
import { Page } from "@/ui/page";

/**
 * The one page that breaks the lead-then-rows shape the others share.
 *
 * Two moves, both earned by the content rather than applied for variety's sake.
 * The head splits: what we do on the left, and on the right the one thing a
 * visitor cannot infer from a publication list — that the same work is
 * available under contract. And each paper carries its own first page, rendered
 * at build time, so the section shows the work instead of only citing it.
 *
 * A cover is optional: a paper whose PDF is not fetchable simply sets its
 * column empty rather than showing a placeholder.
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
                    Stated, not sold. The register here follows the rest of the
                    site: name the thing and say what it involves, in the same
                    voice the Services rows use.
                */}
                <div className="research-aside">
                    <h3>Contract research</h3>
                    <p>
                        Feasibility studies, method development and evaluation, carried
                        out under contract. Findings are delivered as a written report, a
                        working prototype, or production code — whichever the question
                        calls for.
                    </p>
                    <p className="research-contact">
                        <a href="mailto:contact@tanh-lab.com">contact@tanh-lab.com</a>
                    </p>
                </div>
            </div>

            <ol ref={ref} className={cn("rows", "papers", "fade", isVisible && "is-in")}>
                {publications.map((publication) => (
                    <li className="row paper" key={publication.title}>
                        {/*
                            The column is held even when there is no cover, so
                            the venue labels stay aligned down the page. A row
                            that jumps left reads as a mistake on a grid this
                            strict; an empty slot reads as "no preview".
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

                        <div className="row-label">
                            <span>{publication.venue}</span>
                            <span className="sub">{publication.venueFull}</span>
                        </div>

                        <div className="row-body">
                            <h3 className="pub-title">
                                <a
                                    href={publication.source.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {publication.title}
                                </a>
                            </h3>
                            <p className="pub-authors">
                                {publication.authors}{" "}
                                <span className="pub-sep">&middot;</span>{" "}
                                <ExternalLink
                                    className="pub-src"
                                    href={publication.source.href}
                                >
                                    {publication.source.label}
                                </ExternalLink>
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </Page>
    );
}
