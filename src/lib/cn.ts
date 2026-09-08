/** Join class names, dropping anything falsy. No Tailwind here, so no merge step. */
export function cn(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(" ");
}
