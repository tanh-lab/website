import { prefersReducedMotion } from "@/lib/motion-preference";
import { onResize } from "@/lib/resize";
import { scrollTick } from "@/ui/scroll-tick";

/**
 * The wordmark travelling from the hero into the header.
 *
 * Both the hero lockup and the header slot are horizontally centred, so the
 * path is a pure vertical rise. All the character has to come out of how it
 * shrinks.
 *
 * The travel is a FLIP run backwards: the brand is laid out by CSS in its
 * FINAL state — the header slot, at --brand-size — and this maps it back onto
 * the hero rig for scroll progress 0. Doing it in that direction means the
 * resting state is plain CSS: if this never runs, the mark still sits correctly
 * in the header instead of stranded mid-screen.
 *
 * Two details do most of the work:
 *
 *   - the scale is interpolated geometrically, not linearly. The range is
 *     around 5.7x; read linearly it collapses inside the first fifth of the
 *     scroll and then barely moves.
 *   - the scale lands before the position does (SCALE_IN), so the mark reaches
 *     its final size a beat early and slides into the slot rather than
 *     converging on it.
 *
 * Everything here is linear in scroll progress. The paging controller owns the
 * easing of the move itself, and a second curve laid over it is what made the
 * shrink finish halfway through.
 */

/** The subtitle is gone by here. */
const SUB_OUT = 0.3;
/** And so is the scroll hint. */
const HINT_OUT = 0.2;
/** Past here the mark is a link back to the top. */
const LIVE = 0.9;
/** Scale lands early — lead and follow. */
const SCALE_IN = 0.95;
/** Past here we count as off the hero. */
const LEFT_HERO = 0.55;
/** px the subtitle rises as it goes. */
const DRIFT = 6;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export interface BrandElements {
    scroller: HTMLElement;
    brand: HTMLElement;
    /** The invisible hero lockup the brand starts its travel from. */
    rig: SVGSVGElement;
    /** A nav link, to sit the serif on the nav's own baseline. */
    navLink: HTMLElement | null;
    hint: HTMLElement | null;
    onProgress?: (scrolled: boolean) => void;
}

export interface BrandTravel {
    /** Re-read the geometry and repaint. Call after the fitted box changes. */
    remeasure: () => void;
    dispose: () => void;
}

export function createBrandTravel(elements: BrandElements): BrandTravel {
    const { scroller, brand, rig, navLink, hint, onProgress } = elements;

    const title = brand.querySelector<SVGSVGElement>(".wordmark-svg");
    const sub = brand.querySelector<SVGSVGElement>(".wordmark-svg.is-sub");
    if (!title) return { remeasure: () => {}, dispose: () => {} };

    let restWidth = 0;
    let heroWidth = 0;
    let dx = 0;
    let dy = 0;
    let lastScrolled: boolean | null = null;

    /**
     * Width drives the size, so the type is re-rendered rather than resampled;
     * the box stays centred on --brand-size's own centre line.
     */
    const setWidth = (w: number) => {
        brand.style.width = `${w}px`;
        brand.style.marginLeft = `${-w / 2}px`;
    };

    const measure = () => {
        // The viewBox is not touched here. It is React-owned, fed from the
        // wordmark store — writing it imperatively survived only until the next
        // render, when React reconciled it back to the placeholder and the mark
        // snapped to header size at the top of the hero.
        const size =
            parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue(
                    "--brand-size"
                )
            ) || 16;
        const viewBoxWidth = parseFloat(
            (title.getAttribute("viewBox") ?? "").split(/\s+/)[2] ?? ""
        );
        // Nothing usable to measure against yet — leave the previous geometry
        // in place rather than zeroing it, which collapsed the mark to a
        // zero-width sliver until the next refit.
        if (!viewBoxWidth) return;

        restWidth = (size / 100) * viewBoxWidth;
        setWidth(restWidth);

        brand.style.transform = "none"; // read the rest state clean
        brand.style.top = "0px";

        // Sit the serif on the nav's own baseline. Measured, not guessed: the
        // SVG box carries more headroom above the cap than the interface face
        // does, and by how much depends on both --brand-size and the nav's
        // metrics. A zero-height inline-block sits ON the baseline of the line
        // it is in, so its bottom edge is that baseline.
        let top =
            parseFloat(getComputedStyle(brand).getPropertyValue("--brand-nudge")) || 0;
        if (navLink) {
            const strut = document.createElement("span");
            strut.style.cssText =
                "display:inline-block;width:0;height:0;vertical-align:baseline";
            navLink.appendChild(strut);
            const navBaseline = strut.getBoundingClientRect().bottom;
            strut.remove();
            if (navBaseline > 0) {
                const box = title.getBoundingClientRect();
                // The wordmark's baseline is 86/106 down its box.
                top += navBaseline - (box.top + (box.height * 86) / 106);
            }
        }
        brand.style.top = `${top}px`;

        const to = title.getBoundingClientRect();
        const from = rig.getBoundingClientRect();
        if (!to.width || !from.width) return;

        heroWidth = from.width;
        dx = from.left + from.width / 2 - (to.left + to.width / 2);
        // The rig sits inside the scroller, so its rect moves with the scroll;
        // the hero is the first page, so adding scrollTop back gives the rect
        // it has at rest.
        dy = from.top + scroller.scrollTop - to.top;
    };

    // Past the first page nothing here changes, so the whole scroll of the rest
    // of the site costs one comparison per frame.
    let last = -1;

    const paint = (force = false) => {
        let p = clamp01(scroller.scrollTop / (scroller.clientHeight || 1));
        if (prefersReducedMotion()) p = p > 0.5 ? 1 : 0;
        if (!force && p === last) return;
        const was = last;
        last = p;

        // Geometric, not linear: across a ~7x range a linear read collapses in
        // the first fifth and then barely moves. Both this and the translate
        // are linear in progress — the paging controller already carries the
        // easing, and a second curve here only fights it.
        if (restWidth > 0 && heroWidth > 0) {
            setWidth(
                restWidth * Math.pow(heroWidth / restWidth, 1 - clamp01(p / SCALE_IN))
            );
        }

        // Translate only — the top edge does not move with the width, so this
        // still maps the mark onto the rig at progress 0.
        brand.style.transform = `translate(${dx * (1 - p)}px, ${dy * (1 - p)}px)`;

        // Both of these are finished well inside the first page; once they are
        // out, stop writing to them.
        if (sub && (p < SUB_OUT || was < SUB_OUT)) {
            const out = clamp01(p / SUB_OUT);
            sub.style.opacity = String(1 - out);
            sub.style.transform = `translateY(${-DRIFT * out}px)`;
        }

        // Clickable only once it has landed, or the hero-sized lockup would
        // swallow clicks across the middle of the first screen.
        if (p > LIVE !== was > LIVE) {
            brand.style.pointerEvents = p > LIVE ? "auto" : "none";
        }

        if (hint && (p < HINT_OUT || was < HINT_OUT)) {
            const opacity = 0.5 * (1 - clamp01(p / HINT_OUT));
            hint.style.opacity = String(opacity);
            hint.style.pointerEvents = opacity < 0.05 ? "none" : "";
        }

        const scrolled = p > LEFT_HERO;
        if (scrolled !== lastScrolled) {
            lastScrolled = scrolled;
            onProgress?.(scrolled);
        }
    };

    const remeasure = () => {
        measure();
        paint(true);
    };

    // Painted straight from the scroll event rather than deferred to the next
    // rAF: the paging controller sets scrollTop from inside a frame, and a rAF
    // hop would land the wordmark one frame behind the page it rides on.
    // paint() early-outs on an unchanged progress, so this stays cheap.
    const onScroll = () => paint();

    const disposers = [scrollTick.on(() => paint()), onResize(remeasure)];
    scroller.addEventListener("scroll", onScroll, { passive: true });
    disposers.push(() => scroller.removeEventListener("scroll", onScroll));

    remeasure();

    return {
        remeasure,
        dispose: () => disposers.forEach((fn) => fn())
    };
}
