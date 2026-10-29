export type CVDType = "protan" | "deutan" | "tritan";

/**
 * A hex color: `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` — the "#" optional, any case,
 * surrounding whitespace trimmed. Alpha is parsed and discarded; the check is on the
 * color channels. Anything else throws a TypeError rather than being read as #000000.
 */
export type HexColor = string;

export interface Conflict {
  a: HexColor;
  b: HexColor;
  normal: number;
  sim: number;
  severity: "risk" | "severe";
}

export interface TypeReport {
  conflicts: Conflict[];
  pass: boolean;
}

export type CVDModel = "machado" | "brettel";

export interface Report {
  distinct: number;
  collapse: number;
  severity: number;
  model: CVDModel;
  pass: boolean;
  types: Record<CVDType, TypeReport>;
}

/**
 * Simulate how a hex color appears under a color-vision deficiency.
 * `severity` 0..1 (default 1) models anomalous trichromacy below full dichromacy.
 * `model` selects the simulation: "machado" (2009, default) or "brettel" (1997).
 *
 * `type` and `model` are matched case-insensitively and trimmed. "normal" returns the
 * color canonicalized to `#rrggbb` — the same shape every other type returns, so
 * `simulate(c, "normal")` can be compared directly with `simulate(c, "deutan")`.
 *
 * @throws {TypeError} on an unrecognized `type` or `model`. Only the canonical short
 * names are accepted — the long clinical forms ("protanopia") are not aliases, and the
 * error names the short form to use. An unknown name is never a silent pass-through.
 * @throws {TypeError} on a color that is not a valid {@link HexColor}.
 */
export function simulate(hex: HexColor, type: CVDType | "normal", severity?: number, model?: CVDModel): string;

/**
 * Canonical type name, or throw. Exported so wrappers can validate against the same
 * vocabulary instead of keeping their own copy of the accepted names. `where` only
 * labels the error message; it does not change what is accepted.
 * @throws {TypeError} on an unrecognized type.
 */
export function normalizeType(type: unknown, where?: string): CVDType | "normal";

/**
 * Canonical model name, or throw. `null`/`undefined` returns the "machado" default.
 * @throws {TypeError} on an unrecognized model.
 */
export function normalizeModel(model: unknown, where?: string): CVDModel;

/**
 * CIEDE2000 perceptual difference between two hex colors.
 * @throws {TypeError} on an invalid {@link HexColor}.
 */
export function deltaE(hex1: HexColor, hex2: HexColor): number;

/**
 * Check a palette: flags pairs distinct to normal vision that collapse under a CVD simulation.
 * @throws {TypeError} on an invalid {@link HexColor} or an unrecognized `model`.
 */
export function checkPalette(hexes: HexColor[], opts?: { distinct?: number; collapse?: number; severity?: number; model?: CVDModel }): Report;

export interface FixReport {
  /** The adjusted, colorblind-safe hex colors, in input order. */
  colors: string[];
  /** Per-color CIEDE2000 distance moved from the original. */
  drift: number[];
  /** Whether the returned palette passes checkPalette. */
  pass: boolean;
  /** Conflicts remaining (nonzero only if the drift budget prevented a full fix). */
  residual: number;
}

/**
 * Return a colorblind-safe version of a palette, staying as near the originals as the drift budget allows.
 * @throws {TypeError} on an invalid {@link HexColor}.
 */
export function fixPalette(hexes: HexColor[], opts?: { distinct?: number; collapse?: number; margin?: number; maxDrift?: number; maxIter?: number }): FixReport;

/** @throws {TypeError} on an invalid {@link HexColor}. */
export function hexToLab(hex: HexColor): [number, number, number];

/** Inverse of hexToLab: CIELAB (D65) back to a #rrggbb hex string. */
export function labToHex(L: number, a: number, b: number): string;

export interface ContrastReport {
  ratio: number;
  large: boolean;
  AA: boolean;
  AAA: boolean;
  ui: boolean;
  pass: boolean;
}

/**
 * WCAG 2.x relative luminance (0-1) of a hex color.
 * @throws {TypeError} on an invalid {@link HexColor}.
 */
export function relLuminance(hex: HexColor): number;

/**
 * WCAG contrast ratio between two hex colors (1.0 to 21.0).
 * @throws {TypeError} on an invalid {@link HexColor}.
 */
export function contrastRatio(hex1: HexColor, hex2: HexColor): number;

/**
 * Check foreground/background legibility against WCAG AA/AAA thresholds.
 * @throws {TypeError} on an invalid {@link HexColor}.
 */
export function checkContrast(fg: HexColor, bg: HexColor, opts?: { large?: boolean }): ContrastReport;

export const TYPES: CVDType[];

export const MODELS: CVDModel[];
