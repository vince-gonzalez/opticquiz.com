// Type definitions for safepalette

export interface PaletteCheck {
  pass: boolean;
  types: Record<"protan" | "deutan" | "tritan", { conflicts: Array<Record<string, unknown>> }>;
}
export interface PaletteFix {
  colors: string[];
  drift: number[];
  pass: boolean;
  residual: number;
}

/** Up to `n` colorblind-safe hex colors (Okabe-Ito for n<=8, safely extended above). */
export function generate(n: number, opts?: Record<string, unknown>): string[];
/** True if every pair stays distinct under protan/deutan/tritan. */
export function isSafe(colors: string[], opts?: Record<string, unknown>): boolean;
/** Adjust an unsafe palette to pass, staying near the originals. */
export function fix(colors: string[], opts?: Record<string, unknown>): PaletteFix;
/** Full per-type conflict report. */
export function check(colors: string[], opts?: Record<string, unknown>): PaletteCheck;
/** The Okabe-Ito colorblind-safe qualitative palette (8 colors). */
export const OKABE_ITO: string[];
