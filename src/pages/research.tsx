import { publications } from "@/data/publications";
import { ExternalLink } from "@/ui/external-link";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { ListRow, Rows } from "@/ui/rows";

export function ResearchPage() {
    return (
        <Page id="research">
            <Lead>
                We work at the intersection of audio software, machine learning and
                instrument design. We conduct applied research for clients, and translate
                findings into shipped products.
            </Lead>

            {/*
                The venue carries the left column, as the labels do on Services.
                The title is the link, but a link with no affordance is not one
                — so the source also sits inline at the end of the citation,
                where it says where the reference goes rather than only that it
                goes somewhere.
            */}
            <Rows as="ol">
                {publications.map((publication) => (
                    <ListRow
                        key={publication.title}
                        label={publication.venue}
                        sub={publication.venueFull}
                    >
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
                    </ListRow>
                ))}
            </Rows>
        </Page>
    );
}
