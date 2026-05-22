import { lazy, Suspense } from "react"
import { Route, Switch } from "wouter"
import { Navbar } from "./components/navbar"

// Shader is heavy (WebGL + paper-design bundle). Lazy so it doesn't block
// initial paint; the dark body bg shows through while it loads.
const GradientBackground = lazy(() =>
  import("./components/gradient-background").then((m) => ({
    default: m.GradientBackground,
  })),
)

// Pages are code-split so the home route ships a small initial bundle.
const HomePage = lazy(() => import("./pages/home").then((m) => ({ default: m.HomePage })))
const ServicesPage = lazy(() =>
  import("./pages/services").then((m) => ({ default: m.ServicesPage })),
)
const ResearchPage = lazy(() =>
  import("./pages/research").then((m) => ({ default: m.ResearchPage })),
)
const OpenSourcePage = lazy(() =>
  import("./pages/open-source").then((m) => ({ default: m.OpenSourcePage })),
)
const ProjectPage = lazy(() =>
  import("./pages/project").then((m) => ({ default: m.ProjectPage })),
)
const AboutPage = lazy(() =>
  import("./pages/about").then((m) => ({ default: m.AboutPage })),
)
const LegalPage = lazy(() =>
  import("./pages/legal").then((m) => ({ default: m.LegalPage })),
)

export function App() {
  return (
    <>
      <Suspense fallback={null}>
        <GradientBackground />
      </Suspense>
      <div
        className="fixed inset-x-0 top-0 -z-10 bg-overlay-dim"
        style={{ height: "100lvh" }}
      />
      <Navbar />

      <Suspense fallback={<main className="min-h-screen" />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/services" component={ServicesPage} />
          <Route path="/research" component={ResearchPage} />
          <Route path="/open-source" component={OpenSourcePage} />
          <Route path="/open-source/:slug" component={ProjectPage} />
          <Route path="/about" component={AboutPage} />
          <Route path="/legal" component={LegalPage} />
          <Route>
            <main className="min-h-screen flex items-center justify-center">
              <p className="text-secondary">Page not found.</p>
            </main>
          </Route>
        </Switch>
      </Suspense>
    </>
  )
}
