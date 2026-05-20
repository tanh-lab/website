import { PageShell } from "../components/page-shell"
import { Section } from "../components/section"

const CONTACT_EMAIL = "contact@tanh-lab.com"
const SITE_OPERATOR = "Valentin Ackva"
const SITE_ADDRESS = ["Harzer Str. 39", "12059 Berlin", "Germany"]

export function LegalPage() {
  return (
    <PageShell title="Legal">
      {/* IMPRESSUM */}
      <Section id="legal-notice" eyebrow="Legal Notice">
        <div className="max-w-2xl mx-auto text-secondary leading-relaxed space-y-xl">
          <div className="text-center">
            <p className="text-muted text-sm">
              Information pursuant to § 5 DDG (German Digital Services Act).
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Operator
            </p>
            <p>{SITE_OPERATOR}</p>
            {SITE_ADDRESS.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Contact
            </p>
            <p>
              Email:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-accent transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Responsible for content (§ 18 Abs. 2 MStV)
            </p>
            <p>{SITE_OPERATOR}, address as above.</p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Disclaimer
            </p>
            <p>
              The contents of this site are created with care, but no guarantee is given
              for accuracy, completeness, or timeliness. As a service provider we are
              responsible for our own content under general law (§ 7(1) DDG). According
              to §§ 8–10 DDG we are not obliged to monitor transmitted or stored
              third-party information. Links to external sites are not endorsements;
              their content is the responsibility of the respective operators and was
              checked at the time of linking.
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              EU Online Dispute Resolution
            </p>
            <p>
              The European Commission provides a platform for online dispute resolution
              (ODR):{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-accent transition-colors"
              >
                ec.europa.eu/consumers/odr
              </a>
              . We are not obliged and not willing to participate in dispute resolution
              proceedings before a consumer arbitration board.
            </p>
          </div>
        </div>
      </Section>

      {/* PRIVACY POLICY */}
      <Section id="privacy" eyebrow="Privacy Policy">
        <div className="max-w-2xl mx-auto text-secondary leading-relaxed space-y-xl">
          <div className="text-center">
            <p className="text-muted text-sm">
              How we process personal data on this website. (Art. 13 GDPR)
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Data controller
            </p>
            <p>{SITE_OPERATOR}</p>
            {SITE_ADDRESS.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="mt-md">
              Contact:{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-accent transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Server log files
            </p>
            <p>
              When you visit this site, our hosting provider automatically processes
              technical data your browser transmits, including IP address, requested URL,
              timestamp, referrer, user agent, and HTTP status. Legal basis is our
              legitimate interest in operating the website securely and reliably
              (Art. 6(1)(f) GDPR). Logs are kept for a maximum of 14 days and then
              deleted.
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Cookies and tracking
            </p>
            <p>
              This site uses no cookies, no analytics, no tracking pixels, and no
              third-party scripts. Fonts are bundled and served from the same domain — no
              external font loaders such as Google Fonts are involved.
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Email contact
            </p>
            <p>
              If you contact us by email, your data (email address, message contents,
              any data you voluntarily share) will be processed solely to respond to your
              inquiry. Legal basis is Art. 6(1)(b) GDPR (pre-contractual measures) and
              Art. 6(1)(f) GDPR (legitimate interest in answering inquiries). Messages
              are deleted once they are no longer needed, unless a legal retention
              obligation applies.
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              External links
            </p>
            <p>
              Outbound links (e.g. to GitHub, arXiv, LinkedIn, ORCID) transfer you to
              third-party services. We have no control over those providers' processing.
              When you click an outbound link, the respective provider's privacy policy
              applies.
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Your rights
            </p>
            <p>
              Under the GDPR you have the right to: access (Art. 15), rectification
              (Art. 16), erasure (Art. 17), restriction of processing (Art. 18),
              portability (Art. 20), and objection (Art. 21). To exercise any of these,
              contact us at{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary hover:text-accent transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
              . You also have the right to lodge a complaint with the supervisory
              authority — for Berlin: Berliner Beauftragte für Datenschutz und
              Informationsfreiheit,{" "}
              <a
                href="https://www.datenschutz-berlin.de"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-accent transition-colors"
              >
                datenschutz-berlin.de
              </a>
              .
            </p>
          </div>

          <div>
            <p className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-primary mb-md">
              Changes
            </p>
            <p>
              This policy may be updated as the site evolves. The version in effect is
              the one published here.
            </p>
          </div>
        </div>
      </Section>
    </PageShell>
  )
}
