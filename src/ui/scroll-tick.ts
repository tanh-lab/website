import { createEmitter } from "@/lib/emitter";

/**
 * Fired in the same frame the paging controller writes `scrollTop`.
 *
 * The brand hangs its paint on this rather than on a scroll event. The frame
 * lifecycle delivers scroll events *before* rAF callbacks, so a `scrollTop`
 * written from inside rAF is only heard about on the next frame — and the
 * wordmark then rides one frame behind the page it is supposed to be pinned
 * to, which reads as the mark lagging or rubber-banding.
 *
 * An emitter rather than a store: there is no meaningful "current value" to
 * replay to a late subscriber, only the fact that a frame just happened.
 */
export const scrollTick = createEmitter<void>();
