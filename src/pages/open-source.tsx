import { projects } from "@/data/projects";
import { ExternalLink } from "@/ui/external-link";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { ListRow, Rows } from "@/ui/rows";

export function OpenSourcePage() {
    return (
        <Page id="open-source">
            <Lead>
                Our libraries and tools are developed in the open. They are on GitHub, to
                use, fork and improve.
            </Lead>

            <Rows as="ol">
                {projects.map((project) => (
                    <ListRow
                        key={project.name}
                        label={project.name}
                        sub={project.summary}
                    >
                        <p>
                            {project.description}{" "}
                            <span className="pub-sep">&middot;</span>{" "}
                            <ExternalLink href={project.href}>GitHub</ExternalLink>
                        </p>
                    </ListRow>
                ))}
            </Rows>
        </Page>
    );
}
