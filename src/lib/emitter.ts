/**
 * The smallest thing that does the job: a typed listener set with an
 * unsubscribe return. Used where a value is pushed rather than stored — the
 * per-frame scroll tick, for instance, which has no meaningful "current"
 * value to replay and so does not belong in a store.
 */
export type Listener<T> = (value: T) => void;

export interface Emitter<T> {
    on: (fn: Listener<T>) => () => void;
    emit: (value: T) => void;
    readonly size: number;
}

export function createEmitter<T = void>(): Emitter<T> {
    const listeners = new Set<Listener<T>>();
    return {
        on(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        emit(value) {
            // Copied before iterating: a listener is allowed to unsubscribe
            // itself from inside its own call, which would otherwise mutate
            // the set mid-iteration.
            for (const fn of [...listeners]) fn(value);
        },
        get size() {
            return listeners.size;
        }
    };
}
