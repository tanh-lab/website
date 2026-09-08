/**
 * Where the flare is looking.
 *
 * The flare follows the pointer, and once the pointer goes quiet it takes over
 * and wanders on its own. Both targets feed the same easing, so the handover
 * is seamless — you cannot see the moment it stops being led.
 */

export interface DriftSettings {
    /** How quickly the flare catches up to wherever it is heading. */
    followEase: number;
    /** How far it wanders once the pointer goes quiet. */
    idleDrift: number;
    /** 0 = a clean slow sine, 1 = a restless irregular wander. */
    idleRoughness: number;
    /** Radius, in uv units, that the whole pointer range is mapped into. */
    pointerReach: number;
    followMouse: boolean;
}

/** ms of stillness before the drift takes over. */
const IDLE_AFTER = 1600;

/** Per 60fps frame; about 8s to ease the drift anchor back to the middle. */
const RECENTER = 0.004;

/**
 * Unit wander. The slow base term carries the movement on ~43s and ~63s
 * periods — incommensurate, so the path never repeats — and `r` layers three
 * faster octaves on top to rough it up. Normalising by the total amplitude
 * keeps the overall excursion the same as roughness changes.
 */
const driftX = (t: number, r: number) => {
    const a = t * 0.35;
    return (
        (Math.sin(a * 0.7) +
            r * 0.55 * Math.sin(a * 2.1 + 1.1) +
            r * 0.35 * Math.sin(a * 5.3 + 2.7) +
            r * 0.22 * Math.sin(a * 11.7 + 0.4)) /
        (1 + r * 1.12)
    );
};

const driftY = (t: number, r: number) => {
    const a = t * 0.35;
    return (
        (Math.sin(a * 0.47 + 1.7) +
            r * 0.55 * Math.sin(a * 1.63 + 0.6) +
            r * 0.35 * Math.sin(a * 4.1 + 2.2) +
            r * 0.22 * Math.sin(a * 9.3 + 1.9)) /
        (1 + r * 1.12)
    );
};

export function createPointerDrift() {
    const pointer = { x: 0.5, y: 0.5 };
    const current = { x: 0.5, y: 0.5 };
    const anchor = { x: 0.5, y: 0.5 };
    const base = { x: 0, y: 0 };

    let lastMove = -Infinity;
    let wasIdle = false;
    let lastRoughness: number | null = null;

    return {
        /** Report the pointer in uv space (origin bottom-left, as GL expects). */
        setPointer(x: number, y: number, timeStamp: number) {
            pointer.x = x;
            pointer.y = y;
            lastMove = timeStamp;
        },

        centre() {
            pointer.x = pointer.y = 0.5;
            current.x = current.y = 0.5;
        },

        /**
         * Advance one frame. `t` is the shader clock, `dt` real seconds.
         * Returns the soft-clamped uv the shader should be given.
         */
        update(t: number, now: number, dt: number, settings: DriftSettings) {
            const idle = !settings.followMouse || now - lastMove > IDLE_AFTER;
            const r = settings.idleRoughness;

            // On entering idle, pin the drift to wherever the pointer left off
            // and zero the curve. Evaluating the wander absolutely would snap
            // the target to an arbitrary point on the path — that was the jump.
            // Re-anchor again if roughness changes mid-drift, for the same
            // reason.
            if (idle && (!wasIdle || r !== lastRoughness)) {
                anchor.x = current.x;
                anchor.y = current.y;
                base.x = driftX(t, r);
                base.y = driftY(t, r);
            }
            wasIdle = idle;
            lastRoughness = r;

            let targetX: number;
            let targetY: number;

            if (idle) {
                // The anchor drifts home slowly, so the flare does not stay
                // parked in a corner just because that is where the cursor was
                // last seen.
                const recenter = 1 - Math.pow(1 - RECENTER, dt * 60);
                anchor.x += (0.5 - anchor.x) * recenter;
                anchor.y += (0.5 - anchor.y) * recenter;
                // Delta form: zero at the transition, so it starts from rest.
                targetX = anchor.x + (driftX(t, r) - base.x) * settings.idleDrift;
                targetY = anchor.y + (driftY(t, r) - base.y) * settings.idleDrift;
            } else {
                targetX = pointer.x;
                targetY = pointer.y;
            }

            // Frame-rate independent easing, so it feels the same at 30 or 120fps.
            const k = 1 - Math.pow(1 - settings.followEase, dt * 60);
            current.x += (targetX - current.x) * k;
            current.y += (targetY - current.y) * k;

            return softClamp(current.x, current.y, settings.pointerReach);
        }
    };
}

/**
 * Everything in the shader keys off how far the pointer sits from centre, so a
 * pointer at the edge kills the effect. Soft-clamp it into a disc of radius
 * `reach` with tanh: near the middle the response is about 1:1, and it eases
 * off toward the edges instead of being uniformly damped.
 */
function softClamp(x: number, y: number, reach: number) {
    const dx = x - 0.5;
    const dy = y - 0.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d <= 1e-6 || reach <= 1e-6) return { x: 0.5, y: 0.5 };
    const k = (reach * Math.tanh(d / reach)) / d;
    return { x: 0.5 + dx * k, y: 0.5 + dy * k };
}
