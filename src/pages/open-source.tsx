import { adopters } from "@/data/adopters";
import { projects } from "@/data/projects";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";
import { ExternalLink } from "@/ui/external-link";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { RepoMark } from "@/ui/repo-mark";

/**
 * Each repository as its own GitHub banner, under a band of the companies
 * shipping them.
 *
 * The band sits above the cards rather than below. At the foot it read as a
 * footnote to the projects — the one piece of outside evidence on the site,
 * buried under the thing it vouches for. Directly under the lead it is seen,
 * and it frames the three cards instead of trailing them.
 *
 * Not the card grid Research uses: those covers are portrait and read as
 * documents, these are landscape and read as repositories, and this page opens
 * on a full-width band rather than a split head.
 */
export function OpenSourcePage() {
    const { ref, isVisible } = useReveal<HTMLOListElement>();
    const { ref: stripRef, isVisible: stripVisible } = useReveal<HTMLDivElement>();

    return (
        <Page id="open-source" title="Open Source">
            <Lead>
                We believe the infrastructure under audio software should be shared. Code
                that others can read improves, and it is easier to trust in something you
                ship.
            </Lead>

            {/*
                Names, not logos. A logo is a trademark and a row of them reads
                as endorsement rather than as use; reproducing one needs the
                owner's permission. See src/data/adopters.ts.
            */}
            <div
                ref={stripRef}
                className={cn("adopters", "fade", stripVisible && "is-in")}
            >
                <h3>Companies using our open source libraries</h3>
                <ul>
                    {adopters.map((adopter) => (
                        <li key={adopter.name}>
                            {adopter.href ? (
                                <a
                                    href={adopter.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {adopter.name}
                                </a>
                            ) : (
                                adopter.name
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <ol ref={ref} className={cn("repos", "fade", isVisible && "is-in")}>
                {projects.map((project) => (
                    <li className="repo" key={project.name}>
                        <a
                            className="repo-mark-link"
                            href={project.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            tabIndex={-1}
                            aria-hidden="true"
                        >
                            <RepoMark name={project.name} />
                        </a>

                        <div className="repo-text">
                            <h3 className="repo-name">
                                <a
                                    href={project.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {project.name}
                                </a>
                                <span className="repo-summary">{project.summary}</span>
                            </h3>
                            <p className="repo-description">
                                {project.description}{" "}
                                <ExternalLink className="repo-link" href={project.href}>
                                    GitHub
                                </ExternalLink>
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </Page>
    );
}
