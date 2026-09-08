export interface Publication {
    venue: string;
    venueFull: string;
    title: string;
    authors: string;
    /** Where the PDF or record lives, and what to call it in the citation. */
    source: { label: string; href: string };
}

/** Newest first. */
export const publications: Publication[] = [
    {
        venue: "LAC 2026",
        venueFull: "Linux Audio Conference",
        title: "SeamLess: Distributed Spatial Audio Rendering on the Linux Audio Stack",
        authors: "Fares Schulz, Max Weidauer, Stefan Weinzierl, Henrik von Coler",
        source: { label: "HAL", href: "https://hal.science/hal-05697686/document" }
    },
    {
        venue: "DAFx 2025",
        venueFull: "28th Int. Conf. on Digital Audio Effects",
        title: "Pitch-Conditioned Instrument Sound Synthesis From an Interactive Timbre Latent Space",
        authors: "Christian Limberg, Fares Schulz, Zhe Zhang, Stefan Weinzierl",
        source: { label: "arXiv", href: "https://arxiv.org/abs/2510.04339" }
    },
    {
        venue: "IS² 2024",
        venueFull: "5th IEEE Int. Symposium on the Internet of Sounds",
        title: "anira: An Architecture for Neural Network Inference in Real-Time Audio Applications",
        authors: "Valentin Ackva, Fares Schulz",
        source: { label: "arXiv", href: "https://arxiv.org/abs/2506.12665" }
    }
];
