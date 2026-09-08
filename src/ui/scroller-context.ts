import { createContext, useContext } from "react";

/**
 * The scrolling element.
 *
 * Everything that observes scrolling has to point at this rather than at the
 * viewport: the pages scroll inside `.scroller`, which is a positioned element
 * inside `.screen`, not the document. An IntersectionObserver left on the
 * default root sees the elements as permanently intersecting and fires once,
 * at load, for all six pages at the same time.
 *
 * Null until the scroller mounts, and on the server.
 */
export const ScrollerContext = createContext<HTMLElement | null>(null);

export const useScroller = () => useContext(ScrollerContext);
