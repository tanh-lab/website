/**
 * The studio as an entity, rather than as a page.
 *
 * This is what `build.ts` turns into the JSON-LD in <head>. Search engines do
 * not infer a company from prose: a name in a wordmark, an address on the legal
 * notice and a GitHub link in the footer are three unrelated strings to them
 * until something says they are one organisation. That is all this file is.
 *
 * Everything here is already public on the site — the address is the one § 5
 * DDG requires on /legal/, and the accounts are the ones already linked. Nothing
 * is stated here that is not stated there.
 */
import { team } from "@/data/people";

/** No trailing slash: every path below is joined to it directly. */
export const SITE_URL = "https://tanh-lab.com";

/** Absolute, because structured data is read away from the page it sits on. */
export function absolute(path: string): string {
    return `${SITE_URL}${path}`;
}

export interface PostalAddress {
    street: string;
    postalCode: string;
    locality: string;
    /** ISO 3166-1 alpha-2. */
    country: string;
}

export const organization = {
    name: "tanh lab",
    /**
     * The one on /legal/, verbatim. A different address in the markup than in
     * the statutory notice is worse than none at all.
     */
    address: {
        street: "Spessartstraße 4",
        postalCode: "14197",
        locality: "Berlin",
        country: "DE"
    } satisfies PostalAddress,
    email: "contact@tanh-lab.com",
    /** The square mark, and the social card. Both checked by the build. */
    logo: "/brand/mark-512.png",
    image: "/brand/card-social.png",
    /**
     * Other profiles that are the same entity. The studio's own accounts only —
     * a founder's personal profile belongs to the person, and is carried on
     * their entry in `people.ts` instead.
     *
     * `build.ts` emits each of these as a `rel="me"` link as well. Mastodon
     * verifies a profile's website by looking for a link back, and only the
     * pair earns the check — GitHub reads the same relation, and it is the
     * literal meaning of the list either way.
     */
    sameAs: [
        "https://github.com/tanh-lab",
        "https://www.linkedin.com/company/tanh-lab/",
        "https://mastodon.social/@tanhlab"
    ],
    /** By name, as the About lead states it; their profiles come from `team`. */
    founders: ["Valentin Ackva", "Fares Schulz"]
};

/** A founder's own accounts, for the Person nodes hung off the organisation. */
export function profilesFor(name: string): string[] {
    return team.find((person) => person.name === name)?.links.map((l) => l.href) ?? [];
}
