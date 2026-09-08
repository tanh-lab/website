import { cn } from "@/lib/cn";
import { useSectionStore } from "@/store/useSectionStore";

/** Three groups separated by a blank line, as in the artwork. */
const MENU: { id: string; label: string }[][] = [
    [{ id: "services", label: "Services" }],
    [
        { id: "research", label: "Research" },
        { id: "open-source", label: "Open Source" }
    ],
    [
        { id: "about", label: "About" },
        { id: "legal", label: "Contact" }
    ]
];

export function Nav() {
    const activeId = useSectionStore((state) => state.activeId);

    return (
        <nav className="menu" id="menu">
            {MENU.map((group, index) => (
                // The groups are positional — a blank line in the artwork —
                // rather than named, so the index is the only identity there is.
                <span className="menu-group" key={index}>
                    {group.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className={cn(activeId === item.id && "is-active")}
                            aria-current={activeId === item.id ? "true" : undefined}
                        >
                            {item.label}
                        </a>
                    ))}
                </span>
            ))}
        </nav>
    );
}
