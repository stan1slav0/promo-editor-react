// Run[]-level helpers shared by detect/ consumers.

import type { Run } from "./types";

/**
 * Flatten lines of runs into a single run list, inserting a plain space run between
 * non-empty lines. Used wherever a multi-line source block is forced onto one output
 * line (button labels, splitRow columns) — a bare `lines.flat()` would glue the last
 * word of one line to the first word of the next ("Click"+"Here" → "ClickHere").
 */
export function joinLinesWithSpace(lines: Run[][]): Run[] {
  const out: Run[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if (out.length > 0) out.push({ text: " " });
    out.push(...line);
  }
  return out;
}
