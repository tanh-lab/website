import { useEffect, useState } from "react";

import { onResize } from "@/lib/resize";
import { AboutPage } from "@/pages/about";
import { ContactPage } from "@/pages/contact";
import { HeroPage } from "@/pages/hero";
import { OpenSourcePage } from "@/pages/open-source";
import { ResearchPage } from "@/pages/research";
import { ServicesPage } from "@/pages/services";
import { WorkPage } from "@/pages/work";
import { useMotionStore } from "@/store/useMotionStore";
import { useThemeStore } from "@/store/useThemeStore";
import { BrandLayer } from "@/ui/brand-layer";
import { Header } from "@/ui/header";
import { HeroArt } from "@/ui/hero-art";
import { Preloader } from "@/ui/preloader";
import { Scroller } from "@/ui/scroller";
import { ScrollerContext } from "@/ui/scroller-context";
import { fitWordmarks } from "@/ui/wordmark-fit";

/**
 * Boot: adopt the theme, fit the wordmarks, and open the two remaining gates
 * the preloader is waiting on.
 */
function useBoot() {
    useEffect(() => {
        const { open } = useMotionStore.getState();
        useThemeStore.getState().hydrate();

        // A first fit against whatever font resolved synchronously, so the hero
        // is never laid out at the placeholder viewBox.
        fitWordmarks();

        if (document.readyState === "complete") {
            open("loaded");
        } else {
            const onLoad = () => open("loaded");
            window.addEventListener("load", onLoad, { once: true });
        }

        if (document.fonts) {
            void document.fonts.ready.then(() => {
                // Refit before the gate opens, not after: this and the brand's
                // remeasure both force layout, and doing them while the
                // preloader still covers the page keeps them off the very frame
                // the intro starts on.
                fitWordmarks();
                open("fonts");
            });
        }

        return onResize(() => fitWordmarks());
    }, []);
}

export function App() {
    useBoot();

    // The header and the shader fade in with the reveal. Driven by a body class
    // rather than per-element props because both live in different subtrees and
    // the transition is purely presentational.
    const revealed = useMotionStore((state) => state.revealed);
    useEffect(() => {
        document.body.classList.toggle("is-ready", revealed);
    }, [revealed]);

    // The scroller element lives here, not inside <Scroller>, because the
    // header, the brand layer and every reveal observer sit outside that
    // subtree and still have to point at it. Held one level above all of them,
    // it is in scope for the whole screen.
    const [scroller, setScroller] = useState<HTMLElement | null>(null);

    return (
        <ScrollerContext.Provider value={scroller}>
            <Preloader />

            <div className="screen">
                {/* Behind everything, and it never scrolls. */}
                <HeroArt />

                {/* Outside the scroller, so they stay put while it moves. */}
                <Header />
                <BrandLayer />

                <Scroller onMount={setScroller}>
                    <HeroPage />
                    <ServicesPage />
                    <WorkPage />
                    <ResearchPage />
                    <OpenSourcePage />
                    <AboutPage />
                    <ContactPage />
                </Scroller>
            </div>
        </ScrollerContext.Provider>
    );
}
