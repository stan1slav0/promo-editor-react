interface RGB {
  r: number;
  g: number;
  b: number;
}
function sanitizeColorInput(color: string): string {
  return color
    .replace(/!important/gi, "")
    .trim()
    .toLowerCase();
}
function isValidRgbChannel(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}
export function parseColor(color: string): RGB | null {
  color = sanitizeColorInput(color);
  if (color.startsWith("#")) {
    const hex = color.substring(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return { r, g, b };
    } else if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return { r, g, b };
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return { r, g, b };
    } else if (hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
      return { r, g, b };
    }
    return null;
  }
  if (color.startsWith("rgb")) {
    const match = color.match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(?:\d*\.?\d+))?\s*\)$/,
    );
    if (!match) return null;
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    if (!isValidRgbChannel(r) || !isValidRgbChannel(g) || !isValidRgbChannel(b))
      return null;
    return { r, g, b };
  }
  return null;
}
export function isBlueish(color: string): boolean {
  const rgb = parseColor(color);
  if (!rgb) return false;
  const { r, g, b } = rgb;
  if (r < 40 && g < 40 && b < 40) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 30) return false;
  if (b > r && b > g) return true;
  if (b >= r && b > g) return true;
  return false;
}
export function isLinkColor(color: string): boolean {
  return isBlueish(color);
}
