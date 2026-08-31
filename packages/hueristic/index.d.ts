export type CvdType = "protan" | "deutan" | "tritan";

export interface Conflict {
  a: string;
  b: string;
  normal: number;
  sim: number;
  severity: "severe" | "risk";
}

export interface TypeReport {
  conflicts: Conflict[];
  pass: boolean;
}

export interface PaletteReport {
  distinct: number;
  collapse: number;
  severity: number;
  model: string;
  pass: boolean;
  types: Record<CvdType, TypeReport>;
}

export interface CheckOptions {
  distinct?: number;
  collapse?: number;
  severity?: number;
  model?: "machado" | "brettel";
}

export interface FixResult {
  pass: boolean;
  colors: string[];
  drift: number[];
  residual?: number;
}

export interface ContrastResult {
  ratio: number;
  AA: boolean;
  AAA: boolean;
}

export function checkPalette(colors: string[], opts?: CheckOptions): PaletteReport;
export function fixPalette(colors: string[], opts?: object): FixResult;
export function simulate(color: string, type: CvdType, severity?: number, model?: string): string;
export function checkContrast(fg: string, bg: string, opts?: { large?: boolean }): ContrastResult;
export function deltaE(a: string, b: string): number;
export function isSafe(colors: string[], opts?: CheckOptions): boolean;
export const TYPES: CvdType[];
