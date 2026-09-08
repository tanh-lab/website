import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";
import { ExternalLink } from "@/ui/external-link";
import { Page } from "@/ui/page";

/** The studio's own account, not a person's — the team's are on About. */
const GITHUB = "https://github.com/tanh-lab";
const EMAIL = "contact@tanh-lab.com";

/**
 * The closing page: an invitation and an address, and nothing else.
 *
 * It used to be the legal notice wearing the word "Contact" in the nav, which
 * answered a visitor ready to write to us with a list of statutory disclosures.
 * Those stay on the legal notice, where the header already links them; this
 * page is the one thing they were buried under.
 *
 * No rows, and no lead-then-rows shape: a section with two sentences and an
 * address in it has nothing to label. The address is set large because it is
 * the only thing on the page anyone came here to act on — at body size, over
 * this much space, it read as a footnote to the sentence above it.
 *
 * The wordmark is deliberately not repeated here. It is already on screen, up
 * in the brand layer, and a second copy a few hundred pixels below the first
 * reads as a duplicate rather than as a sign-off.
 */
export function ContactPage() {
    const { ref, isVisible } = useReveal<HTMLDivElement>();
    const { ref: reachRef, isVisible: reachVisible } = useReveal<HTMLDivElement>();

    return (
        <Page id="contact">
            <div ref={ref} className={cn("contact-head", "fade", isVisible && "is-in")}>
                <p className="contact-eyebrow">Get in touch</p>
                <h2 className="contact-title">We love a challenge.</h2>
                <p className="contact-copy">
                    We are always on the lookout for new challenges. Please reach out, we
                    would be happy to help.
                </p>
            </div>

            <div
                ref={reachRef}
                className={cn("contact-reach", "fade", reachVisible && "is-in")}
            >
                <a className="contact-mail" href={`mailto:${EMAIL}`}>
                    {EMAIL}
                </a>

                <p className="contact-elsewhere">
                    <ExternalLink href={GITHUB}>GitHub</ExternalLink>
                    <span className="pub-sep">&middot;</span>
                    <a href="#legal">Legal notice</a>
                </p>
            </div>
        </Page>
    );
}
