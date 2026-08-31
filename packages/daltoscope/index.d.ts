// Type definitions for daltoscope

export type DeficiencyType = "protan" | "deutan" | "tritan";

export interface SimulateImageOptions {
  /** 0..1 — deficiency strength; 1 (default) is full dichromacy. */
  severity?: number;
  /** Cap the longest output side in pixels. Default 2000; 0 keeps the original size. */
  maxSide?: number;
}

/** How a single color appears under a deficiency. Returns a hex string. */
export function simulate(
  color: string,
  type: DeficiencyType,
  severity?: number,
  model?: string
): string;

/** The same color under all three deficiencies, for side-by-side comparison. */
export function simulateAll(
  color: string,
  severity?: number
): { protan: string; deutan: string; tritan: string };

/**
 * Recolor an image as `type` sees it.
 * @param input a file path, a Buffer, or a base64 data URI (PNG or JPEG).
 * @returns a PNG Buffer.
 */
export function simulateImage(
  input: string | Buffer,
  type: DeficiencyType,
  opts?: SimulateImageOptions
): Buffer;

export const TYPES: DeficiencyType[];
