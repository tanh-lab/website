import { useEffect, useRef } from "react";

import { onResize } from "@/lib/resize";
import { MobileMenu } from "@/ui/mobile-menu";
import { Nav } from "@/ui/nav";
import { ThemeToggle } from "@/ui/theme-toggle";

/**
 * The fixed header.
 *
 * It is difference-blended rather than driven by a scroll listener, so it stays
 * legible over any section for free — including the one page that reverses
 * ground and ink.
 *
 * Its measured height is published as `--header-h`. The nav keeps its stacked
 * shape on every page, so it is tall and it owns the left gutter all the way
 * down; the pages need to start below it, and hard-coding a number that the
 * type scale or a font fallback would invalidate is what put content under the
 * nav at short viewport heights.
 */
export function Header() {
    const ref = useRef<HTMLElement>(null);

    useEffect(() => {
        const header = ref.current;
        if (!header) return;

        const publish = () => {
            const height = header.getBoundingClientRect().height;
            if (height > 0) {
                document.documentElement.style.setProperty("--header-h", `${height}px`);
            }
        };

        publish();
        // The height moves once the webfont lands and the nav re-lays out.
        document.fonts?.ready.then(publish);
        return onResize(publish);
    }, []);

    return (
        <header className="header" id="header" ref={ref}>
            <div className="header-content w">
                <Nav />

                <div className="header-actions">
                    {/*
                        Both are plain documents under public/, not sections of
                        this one: they are separate destinations, so they stay
                        real navigations rather than hashes the scroller would
                        have to answer for.

                        The legal notice was a section until it was reached by
                        scrolling past Contact, which is not what a disclosure
                        page is for — it is somewhere you go when you are
                        looking for it.
                    */}
                    <a className="header-cta" href="/client/">
                        Client Login
                    </a>
                    <a className="header-cta" href="/legal/">
                        Legal
                    </a>
                    <ThemeToggle />

                    {/*
                        Both the nav and the two links above are out of the
                        header on a phone; this is where they go. It renders at
                        every width and the stylesheet decides when it shows, so
                        there is no breakpoint duplicated in JS.
                    */}
                    <MobileMenu />
                </div>
            </div>
        </header>
    );
}
