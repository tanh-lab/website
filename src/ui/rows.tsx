import type { ReactNode } from "react";

import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/cn";

/**
 * Every section page has the same bones: a lead, then rows carrying a label on
 * columns 1–6 and the content on 8–18.
 *
 * The element matters semantically and is chosen per page — a definition list
 * where the label names the body, an ordered list where the rows are a sequence
 * — so it is a prop rather than a fixed tag.
 */
export function Rows({ as = "dl", children }: { as?: "dl" | "ol"; children: ReactNode }) {
    const { ref, isVisible } = useReveal<HTMLElement>();
    const className = cn("rows", "fade", isVisible && "is-in");

    return as === "ol" ? (
        <ol ref={ref as React.Ref<HTMLOListElement>} className={className}>
            {children}
        </ol>
    ) : (
        <dl ref={ref as React.Ref<HTMLDListElement>} className={className}>
            {children}
        </dl>
    );
}

/** A row inside a `<dl>`: the label defines the body. */
export function DefinitionRow({
    label,
    sub,
    children
}: {
    label: ReactNode;
    sub?: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="row">
            <dt className="row-label">
                {sub ? (
                    <>
                        <span>{label}</span>
                        <span className="sub">{sub}</span>
                    </>
                ) : (
                    label
                )}
            </dt>
            <dd className="row-body">{children}</dd>
        </div>
    );
}

/** A row inside an `<ol>`: the label is a heading for the body, not a term. */
export function ListRow({
    label,
    sub,
    children
}: {
    label: ReactNode;
    sub?: ReactNode;
    children: ReactNode;
}) {
    return (
        <li className="row">
            <div className="row-label">
                <span>{label}</span>
                {sub ? <span className="sub">{sub}</span> : null}
            </div>
            <div className="row-body">{children}</div>
        </li>
    );
}
