import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { useMotionStore } from "@/store/useMotionStore";
import { useSectionStore } from "@/store/useSectionStore";
import { useWordmarkStore } from "@/store/useWordmarkStore";
import type { BrandTravel } from "@/ui/brand";
import { createBrandTravel } from "@/ui/brand";
import { useScroller } from "@/ui/scroller-context";
import { Wordmark } from "@/ui/wordmark";

/**
 * The wordmark, in its own layer beside the header rather than inside it.
 *
 * The header is difference-blended to stay legible over any section, which a
 * mark this size cannot survive — over the shader it comes out green. So this
 * layer mirrors the header's top padding and gutters to land on the same line
 * as the nav, without inheriting the blend. The one page that actually needs
 * the inversion asks for it explicitly, through `is-brand-inverted`.
 *
 * Laid out by CSS at its FINAL state; the travel maps it back onto the hero rig
 * for scroll progress 0. If the script never runs the mark still sits correctly
 * in the header, rather than stranded mid-screen.
 */
export function BrandLayer() {
    const brandRef = useRef<HTMLAnchorElement>(null);
    const travelRef = useRef<BrandTravel | null>(null);
    const scroller = useScroller();
    const revealed = useMotionStore((state) => state.revealed);
    const inverted = useSectionStore((state) => state.inverted);
    const titleBox = useWordmarkStore((state) => state.title);
    const subBox = useWordmarkStore((state) => state.sub);

    useEffect(() => {
        const brand = brandRef.current;
        if (!brand || !scroller) return;

        // Queried rather than passed as refs: the travel is a geometric
        // relationship between elements in three different subtrees — the rig
        // inside the scroller, the nav inside the header, the hint inside the
        // hero — and threading refs through all of them would put layout
        // plumbing into every component on the way.
        const rig = scroller.querySelector<SVGSVGElement>(
            ".hero-lockup.is-rig .wordmark-svg:not(.is-sub)"
        );
        if (!rig) return;

        const travel = createBrandTravel({
            scroller,
            brand,
            rig,
            navLink: document.querySelector(".menu a"),
            hint: scroller.querySelector(".scroll-hint"),
            onProgress: (scrolled) =>
                document.body.classList.toggle("is-scrolled", scrolled)
        });
        travelRef.current = travel;

        return () => {
            travelRef.current = null;
            travel.dispose();
        };
    }, [scroller]);

    // The geometry is read off the rendered marks, so it can only be re-read
    // once React has committed the newly fitted box — not when the store
    // changes. Hence an effect on the box values rather than a store
    // subscription inside the travel.
    useEffect(() => {
        travelRef.current?.remeasure();
    }, [titleBox, subBox]);

    // Set here rather than on <body> by the observer, so the class and the
    // element that reads it live in the same file.
    useEffect(() => {
        document.body.classList.toggle("is-brand-inverted", inverted);
    }, [inverted]);

    return (
        <div className="brand-layer">
            <div className="w">
                <a
                    ref={brandRef}
                    className={cn("brand", "fade", revealed && "is-in")}
                    id="brand"
                    href="#top"
                >
                    <Wordmark />
                    <Wordmark sub />
                    {/*
                        The name is carried in the content rather than in an
                        aria-label. Both wordmarks are aria-hidden but still
                        rendered text, and axe compares a link's visible text
                        against an author-supplied name: a label that says
                        anything other than both lines verbatim reads as a
                        mismatch. Naming it from content sidesteps that and says
                        the same thing to a screen reader.
                    */}
                    <span className="visually-hidden">
                        tanh lab, audio software agency — back to the top
                    </span>
                </a>
            </div>
        </div>
    );
}
