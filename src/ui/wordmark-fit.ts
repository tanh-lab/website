import {
    PLACEHOLDER_SUB,
    PLACEHOLDER_TITLE,
    useWordmarkStore
} from "@/store/useWordmarkStore";

/**
 * Measure the wordmark and publish the fitted viewBox for both lines.
 *
 * `getComputedTextLength` reports the advance width in the viewBox's own user
 * units, which is independent of how large the SVG is drawn — so one
 * measurement serves every copy of the mark, and a resize does not change it.
 * Only a change of font does.
 *
 * The measurement is taken from the hero rig, which is laid out (and merely
 * `visibility: hidden`) precisely so there is something real to measure.
 */

const heightOf = (viewBox: string, fallback: string) =>
    viewBox.split(/\s+/)[3] ?? fallback.split(/\s+/)[3] ?? "106";

function measure(svg: SVGSVGElement | null, placeholder: string): string | null {
    if (!svg || !svg.getClientRects().length) return null;
    const text = svg.querySelector("text");
    if (!text) return null;
    const width = text.getComputedTextLength();
    if (width <= 0) return null;
    // Keep whatever height the markup declared — only the width is fitted.
    return `0 0 ${width} ${heightOf(svg.getAttribute("viewBox") ?? "", placeholder)}`;
}

export function fitWordmarks(root: ParentNode = document) {
    // Measured off the rig rather than off the brand: the brand's rendered size
    // is derived from the fitted box, so measuring its text to set that box is a
    // feedback loop that shrinks the mark a little more on every refit.
    const rig = root.querySelector<SVGSVGElement>(
        ".hero-lockup.is-rig .wordmark-svg:not(.is-sub)"
    );
    const rigSub = root.querySelector<SVGSVGElement>(
        ".hero-lockup.is-rig .wordmark-svg.is-sub"
    );

    const { title, sub, setBoxes } = useWordmarkStore.getState();
    setBoxes(
        measure(rig, PLACEHOLDER_TITLE) ?? title,
        measure(rigSub, PLACEHOLDER_SUB) ?? sub
    );
}
