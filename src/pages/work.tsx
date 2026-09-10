import type { Partner } from "@/data/partners";
import { partners } from "@/data/partners";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";
import { Lead } from "@/ui/lead";
import { Page } from "@/ui/page";
import { PartnerLogo } from "@/ui/partner-logo";

/**
 * What a row carries: the mark where there is one, the name in type where there
 * is not.
 *
 * The name is always in the markup either way. Behind a mark it sits under
 * the logo on hover rather than being dropped — a row whose only content is a
 * mask has no accessible name at all, so the link would be announced as its
 * URL, and the page would read as five anonymous links. The same text is what
 * a partner gets if their file ever fails to load.
 */
function PartnerRow({ partner }: { partner: Partner }) {
    return (
        <>
            {partner.logo ? (
                <>
                    <PartnerLogo logo={partner.logo} />
                    <span className="partner-label">{partner.name}</span>
                </>
            ) : (
                <span className="partner-name">{partner.name}</span>
            )}
        </>
    );
}

/**
 * Who we build for, between the offer and the evidence.
 *
 * Services states what we do; Research and Open Source are what we can show in
 * public. This page is the part in between: the work that ships under someone
 * else's name, which is most of it.
 *
 * The partners are their own marks rather than their names set in our type.
 * Both were tried: the names alone read as a directory, and the two together
 * said each company twice on one line. A mark carries the recognition a name
 * in someone else's typeface cannot, which is the whole reason a partner list
 * is worth showing.
 *
 * They run as a strip rather than down the page. Heights are optical — wide
 * wordmarks sit shorter — so they read as a set of equals rather than as two
 * giants and three small ones. Widths follow each mark's own proportions.
 *
 * Partners only, for now. Released products join this page as a second block
 * under their own label once any of them are out — which is why the list
 * carries a heading rather than standing alone as the page.
 */
export function WorkPage() {
    const { ref, isVisible } = useReveal<HTMLDivElement>();

    return (
        <Page id="work">
            <Lead>We develop audio software for studios and manufacturers.</Lead>

            <div ref={ref} className={cn("partners", "fade", isVisible && "is-in")}>
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
                                    <PartnerRow partner={partner} />
                                </a>
                            ) : (
                                <span className="partner-plain">
                                    <PartnerRow partner={partner} />
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </Page>
    );
}
