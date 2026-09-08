import { App } from "@/App";

/**
 * The tree as build.ts pre-renders it.
 *
 * No router and no props: the site is one document, so the pre-render is the
 * whole page exactly as the client will hydrate it.
 */
export function SSRApp() {
    return <App />;
}
