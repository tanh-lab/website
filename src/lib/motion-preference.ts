/**
 * `prefers-reduced-motion`, read live rather than latched at module load.
 *
 * It was captured once into a `const` at startup, so toggling the system
 * setting did nothing until a reload — and worse, the preloader and the
 * shader captured it at different moments during boot.
 */
let query: MediaQueryList | null = null;

const get = () => {
    if (typeof window === "undefined") return null;
    query ??= window.matchMedia("(prefers-reduced-motion: reduce)");
    return query;
};

export const prefersReducedMotion = () => get()?.matches ?? false;

export function onMotionPreferenceChange(fn: (reduced: boolean) => void): () => void {
    const mq = get();
    if (!mq) return () => {};
    const handler = (e: MediaQueryListEvent) => fn(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
}
