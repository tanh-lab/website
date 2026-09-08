export interface Person {
    name: string;
    links: { label: string; href: string }[];
}

export const founders: Person[] = [
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
    }
];

export const contributors: Person[] = [
    {
        name: "Rodrigo Diaz",
        links: [
            { label: "LinkedIn", href: "https://www.linkedin.com/in/rodrigodzf/" },
            { label: "GitHub", href: "https://github.com/rodrigodzf" },
            { label: "ORCID", href: "https://orcid.org/0009-0009-0862-2967" }
        ]
    }
];
