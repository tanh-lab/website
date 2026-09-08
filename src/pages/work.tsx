import { partners } from "@/data/partners";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { PartnerLogo } from "@/ui/partner-logo";

/**
 * Who we build for, between the offer and the evidence.
 *
 * Services states what we do; Research and Open Source are what we can show in
 * public. This page is the part in between: the work that ships under someone
 * else's name, which is most of it.
 *
 * Partners only, for now. Released products join this page as a second block
 * under their own label once any of them are out — which is why the list
 * carries a heading rather than standing alone as the page.
 *
 * Not the adopters band that Open Source uses. There the names are a rule above
 * the cards they vouch for and are sized to frame them; here they are the whole
 * page, so they are set as a directory — one to a line, ruled like the rows
 * elsewhere, at a size that fills the screen rather than a band that floats in
 * the middle of it.
 */
export function WorkPage() {
    const { ref, isVisible } = useReveal<HTMLDivElement>();

    // The mark column is reserved for the whole list or for none of it — see
    // PartnerLogo. Derived rather than hardcoded so that adding the first mark
    // to partners.ts is the only edit that turns the column on.
    const marked = partners.some((partner) => partner.logo);

    return (
        <Page id="work">
            <Lead>
                We develop audio software for studios and manufacturers. Most of it ships
                inside someone else&rsquo;s product, under their name.
            </Lead>

            <div
                ref={ref}
                className={cn(
                    "partners",
                    marked && "has-marks",
                    "fade",
                    isVisible && "is-in"
                )}
            >
                <h3>Partners</h3>

                <ul>
                    {partners.map((partner) => (
                        <li className="partner" key={partner.name}>
                            {partner.href ? (
                                <a
                                    href={partner.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {marked ? <PartnerLogo logo={partner.logo} /> : null}
                                    <span className="partner-name">{partner.name}</span>
                                    {/*
                                        Decorative: the name is the accessible
                                        label, and "Suture Sound Inc ↗" read
                                        aloud on every row of a list this long
                                        is noise. The link's own target already
                                        announces itself.
                                    */}
                                    <span className="partner-arrow" aria-hidden="true">
                                        &#8599;
                                    </span>
                                </a>
                            ) : (
                                <span className="partner-plain">
                                    {marked ? <PartnerLogo logo={partner.logo} /> : null}
                                    <span className="partner-name">{partner.name}</span>
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </Page>
    );
}
