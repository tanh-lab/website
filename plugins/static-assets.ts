import type { BunPlugin } from "bun";

/**
 * Leave root-absolute asset URLs alone.
 *
 * The fonts are served from `public/` and must not be pulled into the module
 * graph. Left to itself Bun's CSS pipeline inlines a font referenced by `url()`
 * as a data URI, which put all five faces — including the three below the fold
 * — into the render-blocking stylesheet, with no separate URL to cache them by.
 * Absolute paths that resolve to nothing on disk simply fail the build instead.
 *
 * `Bun.build` takes an `external` option that covers this, but the dev server's
 * bundler has no equivalent, so the rule lives in a plugin that both can load:
 * `bunfig.toml` registers it for `bun --hot`, and build.ts passes it directly.
 * Without that the two disagree, and the site only breaks in one of them.
 */
export const staticAssets: BunPlugin = {
    name: "static-assets",
    setup(build) {
        build.onResolve({ filter: /^\/(fonts|assets)\// }, (args) => ({
            path: args.path,
            external: true
        }));
    }
};

export default staticAssets;
