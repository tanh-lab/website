import { Wordmark } from "@/ui/wordmark";

/**
 * The first screen.
 *
 * The lockup you actually see is the brand, up in its own layer above the
 * header. The one here is an invisible measuring rig: it still lays out and is
 * still fitted, so the brand can read the exact rect it has to start its travel
 * from. Keeping the rig in the flow is what makes the travel survive a resize,
 * a font swap or a change to the type scale without a single hard-coded number.
 */
export function HeroPage() {
    return (
        <section className="hero module" id="top">
            <div className="hero-content w">
                <div className="hero-lockup is-rig" aria-hidden="true">
                    <div className="lockup">
                        <Wordmark />
                        <Wordmark sub />
                    </div>
                </div>
            </div>

            <a className="scroll-hint" href="#services" aria-label="Scroll to Services">
                <span className="scroll-hint-pill">
                    <span className="scroll-hint-dot" />
                </span>
            </a>
        </section>
    );
}
