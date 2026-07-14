export type CVDType = "protan" | "deutan" | "tritan";

export interface Conflict {
  a: string;
  b: string;
  normal: number;
  sim: number;
  severity: "risk" | "severe";
}

export interface TypeReport {
  conflicts: Conflict[];
  pass: boolean;
}

export interface Report {
  distinct: number;
  collapse: number;
  pass: boolean;
  types: Record<CVDType, TypeReport>;
}

/** Simulate how a hex color appears under a color-vision deficiency (Machado 2009). */
export function simulate(hex: string, type: CVDType | "normal"): string;

/** CIEDE2000 perceptual difference between two hex colors. */
export function deltaE(hex1: string, hex2: string): number;

/** Check a palette: flags pairs distinct to normal vision that collapse under a CVD simulation. */
export function checkPalette(hexes: string[], opts?: { distinct?: number; collapse?: number }): Report;

export function hexToLab(hex: string): [number, number, number];

export interface ContrastReport {
  ratio: number;
  large: boolean;
  AA: boolean;
  AAA: boolean;
  ui: boolean;
  pass: boolean;
}

/** WCAG 2.x relative luminance (0-1) of a hex color. */
export function relLuminance(hex: string): number;

/** WCAG contrast ratio between two hex colors (1.0 to 21.0). */
export function contrastRatio(hex1: string, hex2: string): number;

/** Check foreground/background legibility against WCAG AA/AAA thresholds. */
export function checkContrast(fg: string, bg: string, opts?: { large?: boolean }): ContrastReport;

export const TYPES: CVDType[];
