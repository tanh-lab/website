export type Project = {
  slug: string
  name: string
  tagline: string
  description: string
  longDescription?: string
  github?: string
  docs?: string
  license?: string
  highlights?: string[]
}

export const projects: Project[] = [
  {
    slug: "anira",
    name: "anira",
    tagline: "Real-time neural inference for audio",
    description:
      "High-performance C++ library for real-time-safe neural network inference inside audio plugins. Multiple backends, deterministic latency.",
    longDescription:
      "anira bridges modern neural network architectures with the hard real-time constraints of audio processing. It runs inference off the audio thread, manages a static thread pool for parallel execution, and ships with benchmarking tools to measure and tune latency end-to-end.",
    github: "https://github.com/anira-project/anira",
    docs: "https://anira-project.github.io/anira/",
    highlights: [
      "Real-time-safe with deterministic runtimes",
      "Static thread pool for parallel inference",
      "Supports LibTorch, ONNX Runtime, TensorFlow Lite",
      "Stateful and stateless models",
      "Cross-platform: macOS · Linux · Windows",
      "Built-in benchmarking tools",
    ],
  },
  {
    slug: "tanh-lib",
    name: "tanh-lib",
    tagline: "Modular C++ audio library",
    description:
      "Four independently buildable C++20 components: threading, lock-free state, DSP, and audio I/O — the foundation under our plugins.",
    longDescription:
      "tanh-lib is our in-house C++20 audio library, structured as four modules you can take in isolation: tanh_core (dispatcher + threading), tanh_state (RCU-style lock-free parameter state), tanh_dsp (DSP primitives, resonators, effects — including a sample-accurate Modulation Matrix), and tanh_audio_io (device abstraction over miniaudio).",
    github: "https://github.com/tanh-lab/tanh-lib",
    highlights: [
      "C++20 · CMake 3.15+",
      "tanh_core — dispatcher & threading",
      "tanh_state — lock-free RCU parameter state",
      "tanh_dsp — DSP primitives, resonators, effects",
      "Sample-accurate Modulation Matrix with per-block event spreading",
      "tanh_audio_io — cross-platform device I/O via miniaudio",
      "RealtimeSanitizer integration",
    ],
  },
  {
    slug: "scyclone",
    name: "Scyclone",
    tagline: "Neural timbre transfer plugin",
    description:
      "Real-time audio plugin that morphs incoming signals into learned target timbres using a RAVE-based variational autoencoder.",
    longDescription:
      "Scyclone is a neural timbre transfer plugin built on the RAVE methodology. It uses a variational autoencoder to transform an incoming signal toward learned target timbres in real time — letting you stack new sonic identities onto drums, atmospheres, or any source, with coupled inference for layered results.",
    github: "https://github.com/Torsion-Audio/Scyclone",
    highlights: [
      "Single and coupled neural inference modes",
      "Pre-processing: Transient Controller + Low/High-Cut",
      "Post-processing: Grain Delay · Blend · Compressor",
      "Built on RAVE (variational autoencoder)",
      "macOS (x86_64 + arm64) · Windows",
    ],
  },
]

export function findProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}
