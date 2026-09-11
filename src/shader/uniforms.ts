import { PALETTES } from "@/shader/palettes";
import type { FlareSettings } from "@/store/useShaderStore";

/**
 * Upload one set of flare settings.
 *
 * Split out of the render loop because there are two callers now and they must
 * agree: the hero draws sixty of these a second, and the brand renderer in
 * tools/ draws exactly one, to a PNG that then goes out as a header image. If
 * the two disagreed about any uniform the printed artwork would quietly stop
 * being the artwork on the site.
 *
 * `iTime` and `iMouse` are deliberately not here. They are the two the callers
 * genuinely differ on — one animates them, the other pins them — and folding
 * them in would mean inventing a value for whichever caller did not care.
 */
export function applyFlareUniforms(
    gl: WebGLRenderingContext,
    uniforms: Record<string, WebGLUniformLocation | null>,
    settings: FlareSettings
): void {
    const palette = PALETTES[settings.palette] ?? PALETTES.fire;

    gl.uniform3fv(uniforms.primaryColor!, palette as unknown as number[]);
    gl.uniform1f(uniforms.intensity!, settings.intensity);
    gl.uniform1f(uniforms.streakLength!, settings.streakLength);
    gl.uniform1f(uniforms.streakHeight!, settings.streakHeight);
    gl.uniform1f(uniforms.glowPower!, settings.glowPower);
    gl.uniform1f(uniforms.flareSize!, settings.flareSize);
    gl.uniform1f(uniforms.colorIntensity!, settings.colorIntensity);
    gl.uniform1f(uniforms.contrastBW!, settings.contrastBW);
    gl.uniform1f(uniforms.saturation!, settings.saturation);
    gl.uniform1i(uniforms.invert!, settings.invert ? 1 : 0);
    gl.uniform1f(uniforms.hueTurn!, settings.hueTurn);
    gl.uniform1f(uniforms.grainAmount!, settings.grainAmount);
    gl.uniform1f(uniforms.grainSize!, settings.grainSize);
}
