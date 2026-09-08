import { ExternalLink } from "@/ui/external-link";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { DefinitionRow, Rows } from "@/ui/rows";

/** Deliberately the tightest page on the site: small print should look like it. */
export function LegalPage() {
    return (
        <Page id="legal">
            <Lead>Information pursuant to &sect;&nbsp;5 DDG.</Lead>

            <Rows as="dl">
                <DefinitionRow label="Contact">
                    <a href="mailto:contact@tanh-lab.com">contact@tanh-lab.com</a>
                </DefinitionRow>

                <DefinitionRow label="Operator">
                    Valentin Ackva
                    <br />
                    Harzer Str. 39
                    <br />
                    12059 Berlin, Germany
                </DefinitionRow>

                <DefinitionRow label="Responsible for content" sub="§ 18 Abs. 2 MStV">
                    Valentin Ackva, address as above.
                </DefinitionRow>

                <DefinitionRow label="Documents">
                    {/*
                        TODO: these two have no destination yet. They are the
                        documents §5 DDG expects to be reachable, so they need
                        real pages before this goes live.
                    */}
                    <a href="#">Privacy policy</a>
                    &nbsp;&nbsp;
                    <a href="#">Legal notice</a>
                    &nbsp;&nbsp;
                    <ExternalLink href="https://ec.europa.eu/consumers/odr">
                        EU dispute resolution
                    </ExternalLink>
                </DefinitionRow>
            </Rows>
        </Page>
    );
}
