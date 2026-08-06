import type { Run } from "./types";
export function joinLinesWithSpace(lines: Run[][]): Run[] {
  const out: Run[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if (out.length > 0) out.push({ text: " " });
    out.push(...line);
  }
  return out;
}
