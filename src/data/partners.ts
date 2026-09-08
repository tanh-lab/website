/**
 * The companies we build audio software with and for.
 *
 * Names as text by default, for the same reason the adopters strip on Open
 * Source is: a logo is a trademark, a row of them reads as endorsement rather
 * than as a working relationship, and reproducing one needs the owner's
 * permission. See src/data/adopters.ts.
 *
 * A mark can be shown beside a name where that permission exists — see `logo`
 * below — but the name stays either way. The names are what carry the page's
 * rhythm, and they are what a partner without a usable mark still has.
 *
 * These two lists are deliberately disjoint and say different things: an
 * adopter ships our open source, a partner is someone we have worked for. A
 * name appearing in both would make the stronger claim twice with nothing to
 * tell the reader which is which.
 *
 * Every entry is a factual claim about a commercial relationship, so nothing
 * goes in here that is not ours to state publicly.
 *
 * `href` is optional and links to the company's own site — not to a product
 * page, and not to a marketplace listing.
 */
export interface Partner {
    name: string;
    href?: string;
    /**
     * The company's mark, under public/logos/partners.
     *
     * The file is used as a *mask*, not drawn: only its silhouette reaches the
     * page, painted in the page's own ink. That is what lets one file serve
     * both themes — every mark we were sent is a white-on-transparent export,
     * invisible on the light ground as an image — and it means none of the
     * artwork has to be recoloured, which is the change most brand guidelines
     * refuse.
     *
     * The `-tight` files are the supplied artwork with the viewBox cropped to
     * the ink and nothing else altered, so a slot given the same `aspect` is
     * filled exactly and sizing becomes arithmetic rather than guesswork.
     *
     * `aspect` is the mark's own width ÷ height, measured off the artwork.
     *
     * `scale` is a per-mark trim, and unset everywhere by default: the strip
     * sets one height for all of them. A dense mark reads heavier than an open
     * one at the same height, so this is here for the case where one visibly
     * breaks the set — not as a general sizing knob.
     */
    logo?: { src: string; aspect: number; scale?: number };
}

export const partners: Partner[] = [
    // suturesound.com is the company's own domain but currently 301s to the
    // founder's site. Linked anyway: it is the address they publish, and it
    // keeps working if they ever put a site back on it.
    {
        name: "Suture Sound Inc",
        href: "https://suturesound.com/",
        logo: {
            src: "/logos/partners/suturesound-tight.svg",
            aspect: 8.38
        }
    },
    {
        name: "Black Salt Audio",
        href: "https://www.blacksaltaudio.com/",
        logo: {
            src: "/logos/partners/bsa-tight.svg",
            aspect: 2.96
        }
    },
    {
        name: "Tonsturm",
        href: "https://tonsturm.com/",
        logo: {
            src: "/logos/partners/Tonsturm-tight.svg",
            aspect: 5.26,
            scale: 1.22
        }
    },
    // Lowercase and one word, as they set it themselves.
    {
        name: "meltedsounds",
        href: "https://www.meltedsounds.com/",
        logo: {
            src: "/logos/partners/meltedsounds-tight.svg",
            aspect: 13.53,
            scale: 0.82
        }
    },
    // Trades as Elastic Instruments; elasticinstruments.com redirects here.
    {
        name: "Elastic Instruments",
        href: "https://mominstruments.com/",
        logo: {
            src: "/logos/partners/ElasticInstruments-tight.svg",
            aspect: 14.14,
            scale: 0.78
        }
    }
];
