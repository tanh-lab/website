/**
 * The sections, as paths.
 *
 * The site is one document and stays one document: `main.tsx` hydrates the
 * pre-rendered markup, so what a route serves has to be exactly what the client
 * renders — the whole scroller, not a slice of it. A route is therefore the
 * homepage served from its own path, with a head that says where you are and a
 * scroller that opens at the right section.
 *
 * Which is a real thing to have — /research/ is a link worth sending, and it
 * answers with a 200 rather than the 404 the Pages fallback gives today — but
 * it is not six new pages, and `ownContent` is where that is admitted.
 */
export interface Route {
    /** The section it opens at: the same id the nav anchors already use. */
    section: string;
    /** Path it is served from, trailing slash included. */
    path: string;
    title: string;
    description: string;
    /**
     * Whether this route carries anything the homepage does not.
     *
     * False for all of them today, because all of them are the same document.
     * While it is false the route canonicalises to `/` and stays out of the
     * sitemap: six URLs each claiming to be the original of identical content
     * is how a site ends up with five of them logged as "duplicate, Google
     * chose a different canonical", which is worse than not having them at all.
     *
     * It flips the day a section has copy that exists only here. Then the route
     * canonicalises to itself, joins the sitemap, and is a page.
     */
    ownContent: boolean;
}

/** In the order the scroller runs, which is the order the nav lists them. */
export const routes: Route[] = [
    {
        section: "services",
        path: "/services/",
        title: "Services — tanh lab",
        description:
            "Plug-in and application development, real-time inference, prototyping, interface design and technical strategy for audio software companies.",
        ownContent: false
    },
    {
        section: "work",
        path: "/work/",
        title: "Work — tanh lab",
        description:
            "Audio software developed for studios and manufacturers, among them Suture Sound, Tonsturm, meltedsounds and Elastic Instruments.",
        ownContent: false
    },
    {
        section: "research",
        path: "/research/",
        title: "Research — tanh lab",
        description:
            "Applied research in audio software, machine learning and instrument design, published at the Linux Audio Conference, DAFx and IEEE IS².",
        ownContent: false
    },
    {
        section: "open-source",
        path: "/open-source/",
        title: "Open Source — tanh lab",
        description:
            "anira and the other libraries tanh lab maintains for real-time neural inference in audio, used by Baby Audio, Neutone and Sonnox.",
        ownContent: false
    },
    {
        section: "about",
        path: "/about/",
        title: "About — tanh lab",
        description:
            "tanh lab is an audio software studio in Berlin, founded by Fares Schulz and Valentin Ackva.",
        ownContent: false
    },
    {
        section: "contact",
        path: "/contact/",
        title: "Contact — tanh lab",
        description:
            "Get in touch with tanh lab: audio software development, real-time DSP and machine learning for audio, from Berlin.",
        ownContent: false
    }
];

/**
 * The section a path opens at, or null for the homepage and for anything the
 * Pages 404 fallback happens to serve this document from.
 */
export function sectionForPath(pathname: string): string | null {
    const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
    return routes.find((route) => route.path === path)?.section ?? null;
}
