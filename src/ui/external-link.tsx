import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * An outbound link.
 *
 * The arrow is markup (not a CSS pseudo) so it survives copy-paste and theming,
 * but `aria-hidden` keeps it out of the accessible name — readers already get
 * the link text, and announcing "↗" is noise. `noopener` is not optional with
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
