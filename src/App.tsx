import { Route, Switch } from "wouter"
import { GradientBackground } from "./components/gradient-background"
import { Navbar } from "./components/navbar"
import { HomePage } from "./pages/home"
import { ServicesPage } from "./pages/services"
import { ResearchPage } from "./pages/research"
import { OpenSourcePage } from "./pages/open-source"
import { ProjectPage } from "./pages/project"
import { AboutPage } from "./pages/about"
import { LegalPage } from "./pages/legal"

export function App() {
  return (
    <>
      <GradientBackground />
      <div className="fixed inset-0 -z-10 bg-overlay-dim" />
      <Navbar />

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
    </>
  )
}
