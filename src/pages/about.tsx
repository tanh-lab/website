import type { Person } from "@/data/people";
import { contributors, founders } from "@/data/people";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { DefinitionRow, Rows } from "@/ui/rows";

function People({ people }: { people: Person[] }) {
    return (
        <div className="people">
            {people.map((person) => (
                <span className="person" key={person.name}>
                    <span className="name">{person.name}</span>
                    <span className="links">
                        {person.links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {link.label}
                            </a>
                        ))}
                    </span>
                </span>
            ))}
        </div>
    );
}

/**
 * The one page that reverses ground and ink, and the airiest of the six: no
 * rules, just people and space.
 */
export function AboutPage() {
    return (
        <Page id="about" inverted>
            <Lead>
                tanh lab is an audio software studio in Berlin, founded by Fares Schulz
                and Valentin Ackva.
            </Lead>

            <Rows as="dl">
                <DefinitionRow label="Founders">
                    <People people={founders} />
                </DefinitionRow>
                <DefinitionRow label="Contributors">
                    <People people={contributors} />
                </DefinitionRow>
                <DefinitionRow label="Location">Berlin, Germany</DefinitionRow>
            </Rows>
        </Page>
    );
}
