import "@/styles/index.css";

import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

import { App } from "@/App";

const root = document.getElementById("root");

if (root) {
    const tree = (
        <StrictMode>
            <App />
        </StrictMode>
    );

    // build.ts pre-renders the markup into #root, so the content is in the HTML
    // for crawlers and paints before this bundle arrives — that build has to be
    // hydrated, not re-rendered. The dev server does no pre-rendering, and
    // hydrating an empty root is a mismatch React reports as a runtime error, so
    // the two cases are told apart by whether there is anything there to adopt.
    if (root.firstChild) {
        hydrateRoot(root, tree);
    } else {
        createRoot(root).render(tree);
    }
}
