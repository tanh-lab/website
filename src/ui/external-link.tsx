import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * An outbound link.
 *
 * The arrow is part of the label rather than a CSS pseudo-element so that it is
 * carried into the accessible name — "GitHub ↗" reads as leaving the site,
 * where a decorative glyph would be dropped. `noopener` is not optional with
 * `target="_blank"`: without it the opened page gets a handle on this one
 * through `window.opener`.
 */
export function ExternalLink({
    href,
    className,
    children
}: {
    href: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <a
            className={cn(className)}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
        >
            {children} <span aria-hidden="true">&#8599;</span>
        </a>
    );
}
