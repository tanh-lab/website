import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";
import { onKeys } from "@/lib/keys";
import { useSectionStore } from "@/store/useSectionStore";
import { MENU } from "@/ui/nav";

/** The width at which responsive.css takes the stacked nav out of the header. */
const NARROW = "(max-width: 620px)";

/**
 * The nav on a phone: a burger in the header, and the whole menu behind it.
 *
 * The panel is portalled to <body> rather than rendered inside the header,
 * because the header is difference-blended — a full-bleed ground nested inside
 * that blend comes out as its own inverse, which is exactly the colour it is
 * trying not to be. Out here it paints on the theme's own background.
 *
 * It stays mounted at every width and is only hidden, so opening and closing
 * can be a transition rather than a mount; `inert` on the closed panel keeps
 * that copy out of the tab order, and `inert` on `#root` while open makes the
 * dialog a real modal — Tab cannot leave into the page behind it.
 */
export function MobileMenu() {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const activeId = useSectionStore((state) => state.activeId);

    useEffect(() => {
        if (!open) return;
        return onKeys(["Escape"], (event) => {
            event.preventDefault();
            setOpen(false);
        });
    }, [open]);

    // The panel is a body sibling of `#root`. Marking the root inert while the
    // menu is open is what contains Tab: only the portalled dialog remains
    // interactive, which is what `aria-modal` claims.
    useEffect(() => {
        if (!open) return;
        const root = document.getElementById("root");
        if (!root) return;
        root.inert = true;
        return () => {
            root.inert = false;
        };
    }, [open]);

    // A rotation into landscape can carry the viewport back past the breakpoint
    // that put the burger there in the first place, leaving a panel open over a
    // nav that is already visible in the header.
    useEffect(() => {
        const narrow = window.matchMedia(NARROW);
        const onChange = () => {
            if (!narrow.matches) setOpen(false);
        };
        narrow.addEventListener("change", onChange);
        return () => narrow.removeEventListener("change", onChange);
    }, []);

    // Focus follows the panel in and comes back out with it. Skipped on the
    // first run: the panel starts closed, and moving focus to the burger on
    // load would scroll it into view and steal it from the document.
    // Landscape close can leave the burger `display: none` — do not focus a
    // hidden control; park on body instead.
    const wasOpen = useRef(false);
    useEffect(() => {
        if (open) {
            closeRef.current?.focus();
        } else if (wasOpen.current) {
            const burger = buttonRef.current;
            if (burger && burger.getClientRects().length > 0) burger.focus();
            else document.body.focus({ preventScroll: true });
        }
        wasOpen.current = open;
    }, [open]);

    const panel = (
        <div
            className={cn("menu-panel", open && "is-open")}
            id="menu-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            inert={!open}
        >
            <div className="menu-panel-bar w">
                <button
                    ref={closeRef}
                    className="menu-panel-close"
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                >
                    <svg viewBox="0 0 18 18" aria-hidden="true">
                        <path
                            d="M4 4 L14 14 M14 4 L4 14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                        />
                    </svg>
                </button>
            </div>

            <nav className="menu-panel-nav w" aria-label="Sections">
                {MENU.map((group, index) => (
                    // Positional groups, as in the header nav: the blank line
                    // between them is the only identity they have.
                    <span className="menu-panel-group" key={index}>
                        {group.map((item) => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className={cn(activeId === item.id && "is-active")}
                                aria-current={activeId === item.id ? "true" : undefined}
                                onClick={() => setOpen(false)}
                            >
                                {item.label}
                            </a>
                        ))}
                    </span>
                ))}
            </nav>

            {/*
                Both of the header's own links, not just the one: below 620px
                the header hides them together, and Legal had nowhere else to
                go — on a phone it was unreachable outright.
            */}
            <div className="menu-panel-foot w">
                <a className="menu-panel-cta" href="/client/">
                    Client Login
                </a>
                <a
                    className="menu-panel-cta"
                    href="/legal/"
                    onClick={() => setOpen(false)}
                >
                    Legal
                </a>
                <a
                    className="menu-panel-cta"
                    href="/privacy/"
                    onClick={() => setOpen(false)}
                >
                    Privacy
                </a>
            </div>
        </div>
    );

    /* build.ts pre-renders this tree, where there is no document to portal
       into. useSyncExternalStore rather than a mounted flag set in an effect:
       it takes a separate server snapshot, so the pre-render and the first
       client render agree without a setState during commit. */
    const isClient = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );

    return (
        <>
            <button
                ref={buttonRef}
                className="menu-burger"
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-controls="menu-panel"
                aria-label="Open menu"
            >
                <svg viewBox="0 0 18 18" aria-hidden="true">
                    <path
                        d="M2 5 H16 M2 9 H16 M2 13 H16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                </svg>
            </button>

            {isClient ? createPortal(panel, document.body) : null}
        </>
    );
}
