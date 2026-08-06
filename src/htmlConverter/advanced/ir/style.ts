export function parseStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const val = decl
      .slice(idx + 1)
      .trim()
      .toLowerCase();
    if (key && val) result[key] = val;
  }
  return result;
}
export function isBold(style: Record<string, string>): boolean {
  const fw = style["font-weight"] ?? "";
  if (fw === "bold") return true;
  const n = parseInt(fw);
  return !isNaN(n) && n >= 600;
}
export function isExplicitNonBold(style: Record<string, string>): boolean {
  const fw = style["font-weight"];
  if (!fw) return false;
  if (fw === "normal") return true;
  const n = parseInt(fw);
  return !isNaN(n) && n < 600;
}
export function isItalic(style: Record<string, string>): boolean {
  return style["font-style"] === "italic";
}
export function isExplicitNonItalic(style: Record<string, string>): boolean {
  return style["font-style"] === "normal";
}
export function isUnderline(style: Record<string, string>): boolean {
  return (style["text-decoration"] ?? "").includes("underline");
}
export function isExplicitNonUnderline(style: Record<string, string>): boolean {
  return style["text-decoration"] === "none";
}
export function getAlign(style: Record<string, string>): Align | undefined {
  const a = style["text-align"];
  if (a === "center" || a === "right" || a === "left") return a;
  return undefined;
}
import type { Align } from "./types";
