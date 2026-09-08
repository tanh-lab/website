export interface Project {
    /** Project names keep their own casing — uppercasing "anira" misspells it. */
    name: string;
    summary: string;
    description: string;
    href: string;
}

export const projects: Project[] = [
    {
        name: "anira",
        summary: "Real-time neural inference for audio",
        description:
            "High-performance C++ library for real-time-safe neural network inference inside audio plugins. Multiple backends, deterministic latency.",
        href: "https://github.com/anira-project/anira"
    },
    {
        name: "tanh-lib",
        summary: "Modular C++ audio library",
        description:
            "Four independently buildable C++20 components: threading, lock-free state, DSP, and audio I/O — the foundation under our plugins.",
        href: "https://github.com/tanh-lab/tanh-lib"
    },
    {
        name: "Scyclone",
        summary: "Neural timbre transfer plugin",
        description:
            "Real-time audio plugin that morphs incoming signals into learned target timbres using a RAVE-based variational autoencoder.",
        href: "https://github.com/Torsion-Audio/Scyclone"
    }
];
