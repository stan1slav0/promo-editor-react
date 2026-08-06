// Color normalization per §5 — pure functions called from fromDom with current background context.
// All entry points accept an optional token set so profile overrides of the
// classification thresholds (blackSnap, darkLuma, …) apply during IR construction.

import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { resolveNamedColor } from "./namedColors";

function parseHex(c: string): [number, number, number] | null {
  const s = c.trim().toLowerCase();
  if (s === "transparent") return null;
  const m3 = s.match(/^#([0-9a-f]{3})$/);
  if (m3) {
    const [, h] = m3;
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  const m6 = s.match(/^#([0-9a-f]{6})$/);
  if (m6) {
    const [, h] = m6;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)$/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  const named = resolveNamedColor(s);
  if (named) return parseHex(named);
  return null;
}

function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function dist(r: number, g: number, b: number): number {
  return Math.sqrt(r * r + g * g + b * b);
}

function isNeutral(r: number, g: number, b: number, tok: Tokens): boolean {
  return Math.max(r, g, b) - Math.min(r, g, b) <= tok.color.neutralTol;
}

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isDarkBg(hex: string, tok: Tokens = defaultTokens): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  return luminance(...rgb) < tok.color.darkLuma;
}

// §5.A: text — near-black and near-white snaps, each guarded by current background luminance.
// Guards prevent snapping visible text to an invisible color (e.g. white text on white bg).
export function canonicalizeText(c: string, currentBg: string, tok: Tokens = defaultTokens): string | null {
  if (!c || c === "transparent") return null;
  const rgb = parseHex(c);
  if (!rgb) return null;
  const [r, g, b] = rgb;

  const dark = isDarkBg(currentBg, tok);

  if (!dark && isNeutral(r, g, b, tok) && dist(r, g, b) <= tok.color.blackSnap) {
    return "#000000";
  }

  if (dark && isNeutral(255 - r, 255 - g, 255 - b, tok) && dist(255 - r, 255 - g, 255 - b) <= tok.color.whiteSnap) {
    return "#ffffff";
  }

  return toHex(r, g, b);
}

// §5.A: background — no near-white snap (light backgrounds like #fff7ed must be preserved).
export function canonicalizeBg(c: string, tok: Tokens = defaultTokens): string | null {
  if (!c || c === "transparent") return null;
  const rgb = parseHex(c);
  if (!rgb) return null;
  const [r, g, b] = rgb;

  if (isNeutral(r, g, b, tok) && dist(r, g, b) <= tok.color.blackSnap) {
    return "#000000";
  }

  return toHex(r, g, b);
}

// Returns true if c is redundant against the current background (§5.B)
export function isBgRedundant(c: string, currentBg: string, tok: Tokens = defaultTokens): boolean {
  const a = parseHex(c);
  const b = parseHex(currentBg);
  if (!a || !b) return false;
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db) <= tok.color.bgRedundant;
}
