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

export const TYPES: CVDType[];
