import type { ReactNode } from "react";

import type { Service } from "@/data/services";
import { services } from "@/data/services";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { DefinitionRow, Rows } from "@/ui/rows";

/**
 * Split the description around the linked phrase. Rendering it as data rather
 * than as embedded markup keeps the copy one readable string in `services.ts`,
 * where a writer can edit it without meeting JSX.
 */
function describe({ description, link }: Service): ReactNode {
    if (!link) return description;
    const at = description.indexOf(link.text);
    if (at < 0) return description;

    return (
        <>
            {description.slice(0, at)}
            <a href={link.href}>{link.text}</a>
            {description.slice(at + link.text.length)}
        </>
    );
}

export function ServicesPage() {
    return (
        <Page id="services">
            {/*
                No page index here: the nav carries "Services" in this same
                column, underlined as the active page, so a label would repeat
                the word directly beneath itself.
            */}
            <Lead>
                We develop audio software and real-time machine learning for audio and
                video signals. We work with audio software companies, from a first
                feasibility study through to release.
            </Lead>

            {/* A definition list, not cards: each name defines what is done. */}
            <Rows as="dl">
                {services.map((service) => (
                    <DefinitionRow key={service.name} label={service.name}>
                        {describe(service)}
                    </DefinitionRow>
                ))}
            </Rows>
        </Page>
    );
}
