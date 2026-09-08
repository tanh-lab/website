import { useState } from "react";

import { useKeys } from "@/hooks/use-keys";
import { cn } from "@/lib/cn";
import type { PaletteName } from "@/shader/palettes";
import { PALETTES } from "@/shader/palettes";
import type { FlareRange } from "@/store/useShaderStore";
import { FLARE_RANGES, useShaderStore } from "@/store/useShaderStore";
import { useThemeStore } from "@/store/useThemeStore";

function Slider({ range }: { range: FlareRange }) {
    const value = useShaderStore((state) => state[range.key]);
    const set = useShaderStore((state) => state.set);

    return (
        <div className="row">
            <label htmlFor={`flare-${range.key}`}>{range.label}</label>
            <span className="val">{value.toFixed(range.step < 0.01 ? 3 : 2)}</span>
            <input
                id={`flare-${range.key}`}
                type="range"
                min={range.min}
                max={range.max}
                step={range.step}
                value={value}
                onChange={(event) => set(range.key, event.currentTarget.valueAsNumber)}
            />
        </div>
    );
}

function Checkbox({ label, name }: { label: string; name: "invert" | "followMouse" }) {
    const checked = useShaderStore((state) => state[name]);
    const set = useShaderStore((state) => state.set);

    return (
        <div className="row check">
            <input
                id={`flare-${name}`}
                type="checkbox"
                checked={checked}
                onChange={(event) => set(name, event.currentTarget.checked)}
            />
            <label htmlFor={`flare-${name}`}>{label}</label>
        </div>
    );
}

/**
 * Every shader option, live. Press C.
 *
 * Built here rather than pulled from dat.gui so it needs no dependency and can
 * be styled like the rest of the page. It is imported only in development, so
 * none of this — nor its stylesheet — reaches the production bundle.
 */
export function FlareControls() {
    const [open, setOpen] = useState(false);
    useKeys(["c", "C"], () => setOpen((v) => !v));

    const palette = useShaderStore((state) => state.palette);
    const set = useShaderStore((state) => state.set);
    const reset = useShaderStore((state) => state.reset);
    const theme = useThemeStore((state) => state.theme);

    return (
        <div className={cn("controls", open && "is-open")}>
            <h2>Flare controls</h2>

            {FLARE_RANGES.map((range) => (
                <Slider key={range.key} range={range} />
            ))}

            <div className="row">
                <label htmlFor="flare-palette">Colour scheme</label>
                <span />
                <select
                    id="flare-palette"
                    value={palette}
                    onChange={(event) =>
                        set("palette", event.currentTarget.value as PaletteName)
                    }
                >
                    {Object.keys(PALETTES).map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>

            <Checkbox label="Invert colours" name="invert" />
            <Checkbox label="Follow pointer" name="followMouse" />

            <div className="actions">
                {/* The theme's preset still wins over the bare defaults. */}
                <button type="button" onClick={() => reset(theme)}>
                    Reset
                </button>
            </div>

            <p className="hint">C — panel · G — grid · 0 — centre flare</p>
        </div>
    );
}
