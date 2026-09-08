import "@/styles/dev.css";

import { DebugGrid } from "@/dev/debug-grid";
import { FlareControls } from "@/dev/flare-controls";

/**
 * Development-only overlays. Reached through a dynamic import behind a
 * `process.env.NODE_ENV` check, which the production build replaces with a
 * literal — so the bundler proves the branch dead and drops this module, its
 * stylesheet and the flare panel with it.
 */
export default function DevTools() {
    return (
        <>
            <FlareControls />
            <DebugGrid />
        </>
    );
}
