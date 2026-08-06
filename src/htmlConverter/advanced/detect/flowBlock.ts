import type { Tokens } from "../config/tokens";
import { tokens as defaultTokens } from "../config/tokens";
import { joinLinesWithSpace } from "../ir/runs";
import type { ComponentNode, Run, StructuralNode } from "../ir/types";
export function detectTextSplit(
  lines: Run[][],
  tok: Tokens,
): {
  left: Run;
  right: Run;
} | null {
  if (lines.length !== 1 || lines[0].length !== 2) return null;
  const [first, second] = lines[0];
  if (first.href || second.href) return null;
  const gapRe = new RegExp(
    `^(.*\\S)( {${tok.layout.textSplitGapMinSpaces},})$`,
    "s",
  );
  const m = first.text.match(gapRe);
  if (!m) return null;
  const rightText = second.text.trim();
  if (!rightText) return null;
  return {
    left: { ...first, text: m[1] },
    right: { ...second, text: rightText },
  };
}
export function textSplitToRecordRow(split: {
  left: Run;
  right: Run;
}): ComponentNode {
  return {
    kind: "recordRow",
    props: {
      widths: [50, 50],
      rows: [
        {
          cells: [
            { lines: [[split.left]], align: "left" },
            { lines: [[split.right]], align: "left" },
          ],
        },
      ],
    },
  };
}
export function classifyFlow(
  nodes: StructuralNode[],
  tok: Tokens = defaultTokens,
): ComponentNode[] {
  const result: ComponentNode[] = [];
  for (const node of nodes) {
    if (node.type !== "p") continue;
    const {
      lines,
      align,
      size,
      headingLevel,
      bg,
      border,
      accentPadX,
      paraBreaks,
      listItem,
      ordered,
      listGroupId,
      tightNext,
      tightBefore,
      marginTopPt,
      marginBottomPt,
      gapBefore,
    } = node;
    if (!lines.some((l) => l.length > 0)) continue;
    if (headingLevel === 5) {
      const allRuns: Run[] = joinLinesWithSpace(lines);
      result.push({
        kind: "buttonBand",
        props: {
          runs: allRuns,
          bg: bg ?? tok.color.button,
          href: tok.placeholderHref,
        },
      });
      continue;
    }
    if (headingLevel === 4) {
      result.push({
        kind: "paragraph",
        props: {
          lines,
          align,
          size,
          variant: "quote",
          paraBreaks,
          tightNext,
          tightBefore,
          marginTopPt,
          marginBottomPt,
          gapBefore,
        },
      });
      continue;
    }
    if (listItem) {
      result.push({
        kind: "list",
        props: {
          items: [joinLinesWithSpace(lines)],
          ordered: ordered ?? false,
          listGroupId,
        },
      });
      continue;
    }
    const isLeftAccentOnly =
      size === "body" &&
      Boolean(border?.left) &&
      !border?.top &&
      !border?.right &&
      !border?.bottom;
    if (isLeftAccentOnly) {
      result.push({
        kind: "calloutLeft",
        props: {
          lines,
          paraBreaks,
          accentColor: border!.left!.color,
          accentWidthPx: border!.left!.widthPx,
          accentStyle: border!.left!.style,
          accentPadX,
          tightNext,
          tightBefore,
          marginTopPt,
          marginBottomPt,
          gapBefore,
        },
      });
      continue;
    }
    if (size === "body" && !bg && !border && (!align || align === "left")) {
      const split = detectTextSplit(lines, tok);
      if (split) {
        result.push(textSplitToRecordRow(split));
        continue;
      }
    }
    result.push({
      kind: "paragraph",
      props: {
        lines,
        align,
        size,
        paraBreaks,
        tightNext,
        tightBefore,
        marginTopPt,
        marginBottomPt,
        gapBefore,
      },
    });
  }
  return result;
}
