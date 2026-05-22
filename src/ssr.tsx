import { Router } from "wouter"
import { App } from "./App"

/**
 * Wraps <App /> in a wouter <Router> with a fixed ssrPath so a single
 * route can be rendered statically. Used by build.ts during SSG.
 */
export function SSRApp({ path }: { path: string }) {
  return (
    <Router ssrPath={path}>
      <App />
    </Router>
  )
}
