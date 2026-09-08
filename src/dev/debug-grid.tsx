import { useState } from "react";

import { useKeys } from "@/hooks/use-keys";
import { cn } from "@/lib/cn";

const COLUMNS = 18;

/** The 18 column grid the layout is set on. Press G. */
export function DebugGrid() {
    const [visible, setVisible] = useState(false);
    useKeys(["g", "G"], () => setVisible((v) => !v));

    return (
        <div className={cn("grid", visible && "is-visible")} id="grid" aria-hidden="true">
            {Array.from({ length: COLUMNS }, (_, i) => (
                <div className="col" key={i} />
            ))}
        </div>
    );
}
