/**
 * Companies known to ship our open source in their own products.
 *
 * Names as text, not logos, and deliberately so: a logo is a trademark, and a
 * row of them reads as endorsement rather than as use. Reproducing one needs
 * the owner's permission, which we do not have — so if any of these grant it,
 * the strip can take marks instead without the layout changing.
 *
 * Each entry is also a factual claim about someone else's product, so nothing
 * goes in here that we could not point at evidence for.
 */
export interface Adopter {
    name: string;
    href?: string;
}

export const adopters: Adopter[] = [
    { name: "Baby Audio", href: "https://babyaud.io/" },
    { name: "Neutone", href: "https://neutone.ai/" },
    { name: "Sonnox", href: "https://www.sonnox.com/" }
];
