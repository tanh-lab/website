export interface Service {
    name: string;
    description: string;
    /**
     * A phrase inside `description` to render as a link. Kept as data rather
     * than as markup so the copy stays one readable string.
     */
    link?: { text: string; href: string };
}

/**
 * Names are labels, set in the interface face at nav size; the descriptions say
 * what is done and stop. The page reads as a specification rather than a pitch.
 */
export const services: Service[] = [
    {
        name: "Audio software development",
        description:
            "Plug-ins, standalone applications, mobile and web. VST3, AU and CLAP, in C++ and JUCE. Cross-platform builds, signing and notarisation."
    },
    {
        name: "Real-time inference",
        description:
            "Neural inference within a real-time audio budget, on device. We develop and maintain anira.",
        link: { text: "anira", href: "#open-source" }
    },
    {
        name: "Research and prototyping",
        description:
            "Feasibility studies for methods that have not been built before, and prototypes that establish what they cost."
    },
    {
        name: "Interface and instrument design",
        description:
            "Interfaces developed alongside the engine, for instruments and for tools."
    },
    {
        name: "Consulting and technical strategy",
        description:
            "Method and architecture review, technology selection, and technical due diligence."
    }
];
