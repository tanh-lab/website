/**
 * One keydown listener for the whole page.
 *
 * There were three — paging, the flare panel and the grid overlay — each with
 * its own idea of when a keypress belongs to the page rather than to a form
 * field. The grid overlay had no guard at all, so typing a "g" into any input
 * toggled it. The guard lives here now, once.
 */
type KeyFn = (event: KeyboardEvent) => void;

const subscribers = new Set<{ keys: Set<string>; fn: KeyFn }>();
let bound = false;

/** True while the keystroke belongs to something the user is typing into. */
function isEditing(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function onKeyDown(event: KeyboardEvent) {
    if (isEditing(event.target)) return;
    for (const sub of [...subscribers]) {
        if (sub.keys.has(event.key)) sub.fn(event);
    }
}

/**
 * Bind one or more `event.key` values. Keys are matched case-sensitively, so
 * a shortcut that should ignore Shift has to list both cases.
 */
export function onKeys(keys: string[], fn: KeyFn): () => void {
    if (!bound) {
        bound = true;
        document.addEventListener("keydown", onKeyDown);
    }
    const sub = { keys: new Set(keys), fn };
    subscribers.add(sub);
    return () => subscribers.delete(sub);
}
