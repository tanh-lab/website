import type { CSSProperties } from "react";

import type { Partner } from "@/data/partners";

/**
 * A partner's mark, standing in for the name rather than beside it.
 *
 * The mark is a CSS mask over `currentColor`, not an `<img>` and not inline
 * SVG. Every export we were sent is white-on-transparent — a dark-theme
 * version — so drawn as images they would be invisible on the light ground,
 * and two of them could not be recoloured from the outside anyway: Tonsturm
 * keeps its fill in an internal `<style>` block. A mask reads only the alpha,
 * so all five behave alike, take the page's own ink in both themes, and none
 * of the artwork is modified — which matters, because recolouring a trademark
 * is the change most brand guidelines refuse.
 *
 * The URL is passed as a custom property rather than written into work.css
 * because it comes from the data. That also keeps it out of the bundler's
 * sight: a `url()` inside a stylesheet is pulled into the module graph and
 * inlined as a data URI, which is what plugins/static-assets.ts exists to
 * prevent for the fonts and covers. A runtime string is never resolved, so
 * these stay separately cached files and no build rule has to know about them.
 *
 * The box carries the mark's own aspect ratio and the height it is sized to,
 * so the mask fills it exactly — the files are cropped to their ink for this.
 * See `Partner.logo` for where the numbers come from.
 *
 * `aria-hidden`, and deliberately: the name travels with the mark as a label
 * in the row, which is what the link is announced as. A label here would say
 * it twice.
 */
export function PartnerLogo({ logo }: { logo: NonNullable<Partner["logo"]> }) {
    const style = {
        "--mark": `url("${logo.src}")`,
        "--mark-aspect": logo.aspect,
        "--mark-scale": logo.scale ?? 1
    } as CSSProperties;

    return <span className="partner-logo" style={style} aria-hidden="true" />;
}
