import type { CSSProperties } from "react";

import type { Partner } from "@/data/partners";

/**
 * A partner's mark, in a slot that is held whether or not there is one.
 *
 * The mark is a CSS mask over `currentColor`, not an `<img>` and not inline
 * SVG. Every export we were sent is white-on-transparent — a dark-theme
 * version — so drawn as images they would be invisible on the light ground,
 * and two of them could not be recoloured from the outside anyway: Tonsturm
 * keeps its fill in an internal `<style>` block, and Suture Sound's symbol is
 * an embedded raster. A mask reads only the alpha, so all five behave alike,
 * take the page's own ink in both themes, and none of the artwork is modified
 * — which matters, because recolouring a trademark is the change most brand
 * guidelines refuse.
 *
 * The URL is passed as a custom property rather than written into work.css
 * because it comes from the data. That also keeps it out of the bundler's
 * sight: a `url()` inside a stylesheet is pulled into the module graph and
 * inlined as a data URI, which is what plugins/static-assets.ts exists to
 * prevent for the fonts and covers. A runtime string is never resolved, so
 * these stay separately cached files and no build rule has to know about them.
 *
 * Empty rather than absent when a partner has no mark: the slot is what keeps
 * the names on a common left edge. Dropped for the ones without, every other
 * name shifts left by the width of one and the list goes ragged — which reads
 * as broken, where an empty slot reads as "no mark". The same reasoning holds
 * the cover slot open on Research.
 *
 * `aria-hidden`, and deliberately: the company name sits beside it as real
 * text, so a label here would have every row announce itself twice.
 */
export function PartnerLogo({ logo }: { logo?: Partner["logo"] }) {
    const style = logo
        ? ({
              "--mark": `url("${logo.src}")`,
              "--mark-scale": logo.scale ?? 1
          } as CSSProperties)
        : undefined;

    return <span className="partner-logo" style={style} aria-hidden="true" />;
}
