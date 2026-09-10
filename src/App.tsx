import { useEffect, useState } from "react";

import { sectionForPath } from "@/data/routes";
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

        // A route document is this same document served from its own path, so
        // the section it names is reached by scrolling rather than by rendering
        // anything different.
        //
        // By page index rather than by offsetTop: the same arithmetic the
        // paging controller uses, so it lands exactly on a snap page rather
        // than near one. Re-run rather than run once for the same reason
        // `fitWordmarks` is — a page is one viewport tall, and at the first
        // commit the scroller has not been given its height yet, so the first
        // attempt multiplies the index by a nonsense number. It is safe to
        // repeat: it only ever runs behind the preloader, and it recomputes the
        // destination from scratch every time.
        const openAtRoute = () => {
            if (useMotionStore.getState().revealed) return;

            const section = sectionForPath(window.location.pathname);
            const scroller = document.getElementById("scroller");
            if (!section || !scroller) return;

            const pages = [...scroller.children].filter((el) =>
                el.matches(".hero, .page")
            );
            const target = pages.findIndex((page) => page.id === section);
            if (target > 0) scroller.scrollTop = target * scroller.clientHeight;
        };

        openAtRoute();

        // A first fit against whatever font resolved synchronously, so the hero
        // is never laid out at the placeholder viewBox.
        fitWordmarks();

        if (document.readyState === "complete") {
            openAtRoute();
            open("loaded");
        } else {
            const onLoad = () => {
                openAtRoute();
                open("loaded");
            };
            window.addEventListener("load", onLoad, { once: true });
        }

        if (document.fonts) {
            void document.fonts.ready.then(() => {
                // Refit before the gate opens, not after: this and the brand's
                // remeasure both force layout, and doing them while the
                // preloader still covers the page keeps them off the very frame
                // the intro starts on.
                fitWordmarks();
                openAtRoute();
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
