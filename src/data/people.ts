export interface Person {
    name: string;
    links: { label: string; href: string }[];
}

/**
 * One list, not founders and contributors separately. Who founded the studio is
 * already stated in the lead, so splitting the list only ranked the people in
 * it.
 *
 * Founders first, then the rest — an ordering, not a hierarchy.
 */
export const team: Person[] = [
    {
        name: "Valentin Ackva",
        links: [
            { label: "LinkedIn", href: "https://www.linkedin.com/in/valentin-ackva/" },
            { label: "GitHub", href: "https://github.com/vackva" },
            { label: "ORCID", href: "https://orcid.org/0009-0006-7300-6253" }
        ]
    },
    {
        name: "Fares Schulz",
        links: [
            {
                label: "LinkedIn",
                href: "https://www.linkedin.com/in/fares-schulz-850a79270/"
            },
            { label: "GitHub", href: "https://github.com/faressc" },
            { label: "ORCID", href: "https://orcid.org/0009-0003-3512-0096" }
        ]
    },
    {
        name: "Rodrigo Diaz",
        links: [
            { label: "LinkedIn", href: "https://www.linkedin.com/in/rodrigodzf/" },
            { label: "GitHub", href: "https://github.com/rodrigodzf" },
            { label: "ORCID", href: "https://orcid.org/0009-0009-0862-2967" }
        ]
    },
    {
        name: "Jakob Stolberg",
        links: [
            { label: "LinkedIn", href: "https://www.linkedin.com/in/jakob-stolberg/" },
            { label: "GitHub", href: "https://github.com/jstolberg" }
        ]
    },
    {
        name: "Lina Campanella",
        links: [
            {
                label: "LinkedIn",
                href: "https://www.linkedin.com/in/lina-campanella-a1062b319/"
            },
            { label: "GitHub", href: "https://github.com/linaclca" }
        ]
    }
];
