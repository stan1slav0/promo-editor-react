// ── Stage 1: Structural IR (dumb DOM mapping) ────────────────────────────────

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;      // already normalized (§5)
  href?: string;
  /** Internal only: set on the LINE_BREAK run for a <br data-one-br> (user-typed §
   * marker). Consumed by fromDom's splitIntoLines to detect § at a paragraph's end —
   * never present on a run that reaches rendering. */
  oneBr?: true;
}

export interface Paragraph {
  type: "p";
  align?: "left" | "center" | "right";
  size: "body" | "small" | "headline";   // role, not px (§6)
  headingLevel?: number;     // original H1–H6 tag level; used by classify to map to components
  accent?: boolean;          // bold accent line → template prepends ▸ (tokens.accentBullet)
  bg?: string;               // background-color declared directly on this element (e.g. an h5
                              // button colored via its own style, not a wrapping colored <td>)
  border?: BorderSpec;       // border declared directly on this element (e.g. a quote/callout
                              // <p> with border-left, not a wrapping colored <td>) — a left-only
                              // border routes to "calloutLeft" in classifyFlow instead of "paragraph"
  accentPadX?: number;       // gap between a border-left and the text (padding-left, falling
                              // back to margin-left), quantized to px — see CalloutLeftProps.accentPadX
  lines: Run[][];            // each line = array of runs; lines joined with <br>
  paraBreaks?: Set<number>;  // line indices preceded by an author-typed blank line
                              // (<br><br> inside one <p>) — rendered as <br><br>
  listItem?: boolean;        // true for a <li>-derived paragraph (real <ul>/<ol>) — routes to
                              // the "list" ComponentNode in classifyFlow instead of "paragraph"
  ordered?: boolean;         // true when the source list was <ol> (numbered) rather than <ul>
  listGroupId?: number;      // increments per <ul>/<ol> encountered in fromDom — distinguishes
                              // two adjacent but separate lists of matching ordered-ness from
                              // consecutive items of the SAME list, so pushMerged's list-merge
                              // (classify.ts) doesn't fuse them into one continuous list
  tightNext?: boolean;       // true if this paragraph's raw HTML ended with a user-typed
                              // § (ONE_BR) marker — signals "no gap before whatever follows",
                              // same tightness class as center-align/listItem in pushMerged
  tightBefore?: boolean;     // true if this paragraph's raw HTML STARTED with a user-typed
                              // § marker — the mirror of tightNext, for when the author places
                              // § at the start of the next paragraph instead of the end of the
                              // previous one. "no gap before ME".
  marginTopPt?: number;       // explicit margin-top declared on the source <p>, in pt.
                              // Together with the previous paragraph's marginBottomPt it decides
                              // whether the boundary is a line break or a gap (pairwise sum vs
                              // tok.layout.gapMarginThresholdPt — see isGapBoundary). Undefined
                              // when the source declared nothing (≠ zero) — unknown → gap.
  marginBottomPt?: number;    // mirror: explicit margin-bottom on the source <p>, in pt
  gapBefore?: boolean;        // an author-typed blank line (top-level <br> or an empty <p>)
                              // immediately precedes this paragraph — an explicit "I want a gap
                              // here", overrides the margin rule and convention-based tight
                              // merging (except §, which is the stronger explicit marker)
}

export interface ImageNode {
  type: "img";
  src: string;
  alt?: string;
}

export interface BorderSide {
  color: string;  // normalized via canonicalizeBg (§5)
  /** Author-declared width, quantized to whole px (pt → px × 96/72, clamped to [1, 12]).
   *  Absent when the source declared no width — renderers fall back to the width token.
   *  Quantizing (instead of ignoring width entirely) keeps the author's thin-line vs
   *  heavy-bar intent while avoiding fractional pt values email clients render unreliably. */
  widthPx?: number;
  /** Author-declared border-style; absent (→ "solid") is the overwhelmingly common case,
   *  so only the two visibly-distinct alternatives are tracked. */
  style?: "dashed" | "dotted";
}

export interface BorderSpec {
  top?: BorderSide;
  right?: BorderSide;
  bottom?: BorderSide;
  left?: BorderSide;
}

export interface CellNode {
  type: "cell";
  colspan?: number;
  bg?: string;
  border?: BorderSpec;      // for classification (§4) and border color — not for metrics
  align?: "left" | "center" | "right";
  /** True for a <th> (vs <td>) — browsers center a header cell's content by default even
   *  with no explicit text-align anywhere in the source (a user-agent stylesheet rule our
   *  parser, which only reads explicit inline CSS, never sees). Consulted as the alignment
   *  fallback (detect/tableBlock.ts's cellAlign) only when neither the cell nor its first
   *  paragraph declares an explicit align — an explicit declaration always wins. */
  isHeader?: boolean;
  children: StructuralNode[];
}

export interface RowNode {
  type: "row";
  cells: CellNode[];
}

export interface TableNode {
  type: "table";
  rows: RowNode[];
  colWidths?: number[];  // relative widths from <colgroup><col> (raw px values, any sum)
  /** An author-typed blank line (top-level <br>, mirrors Paragraph.gapBefore) immediately
   *  precedes this table — an explicit "these are separate things" signal that stops
   *  detect/tableBlock.ts's recordRow from silently fusing it with an immediately preceding
   *  same-column-count table (the fusion itself is intentional: GDocs sometimes serializes
   *  one logical table as several consecutive <table> elements with NO gap between them). */
  gapBefore?: boolean;
}

/**
 * A `i-r-s`…`i-r-s-e` / `i-l-s`…`i-l-s-e` marker pair (see markers.ts) resolved by
 * preprocess.ts's resolveSideImageMarkers into a `<div data-side-image>` wrapper —
 * everything the author selected when they wrapped it, floated a placeholder image
 * beside. `tightBefore` mirrors TableNode.gapBefore's convention of carrying a
 * pending §/blank-line signal from fromDom's top-level tracking onto the node
 * itself (this node is pushed as ONE StructuralNode, unlike the generic DIV/
 * BLOCKQUOTE container branch which flattens its children into the parent list).
 */
export interface SideImageWrapNode {
  type: "sideImageWrap";
  side: "left" | "right";
  children: StructuralNode[];
  tightBefore?: boolean;
}

/** Collector for non-fatal conversion issues (silently-dropped/flattened content). */
export type WarnFn = (message: string) => void;

export type StructuralNode = TableNode | RowNode | CellNode | Paragraph | ImageNode | SideImageWrapNode;

// ── Stage 2: Semantic IR (classified, renderable) ────────────────────────────
//
// ComponentNode is a discriminated union: each `kind` carries its own typed
// `props` shape. Producers (detect/*) build these literals under compile-time
// checking; the renderer (render/toEmailHtml) narrows on `kind` and reads props
// without casts. Add a kind by extending both the union and the render switch —
// the exhaustiveness check will flag the missing case.

export type Align = "left" | "center" | "right";
export type SizeRole = "body" | "small" | "headline";

export interface ParagraphProps {
  lines: Run[][];
  size: SizeRole;
  align?: Align;
  variant?: "quote";           // h4 marker: extra horizontal indent
  paraBreaks?: Set<number>;    // line indices rendered as <br><br>
  /**
   * A real <ul>/<ol> (see ListProps) that sits between this paragraph's flowing lines —
   * e.g. "intro line" → list → "continuing prose", all one visual block/<td>, matching
   * GDocs' own layout instead of splitting into separate blocks. Same `atLine` convention
   * as AlertBandProps.buttons: the list renders before `lines[atLine]`, doesn't occupy a
   * lines slot itself.
   */
  lists?: { atLine: number; props: ListProps }[];
  tightNext?: boolean;         // ends with § — next merged paragraph gets no gap before it
  /**
   * Two roles, same field: (1) INPUT, propagated straight from the source Paragraph
   * (fromDom.ts) when the author's raw HTML started with § — one of pushMerged's
   * merge-eligibility signals, same as tightNext. (2) OUTPUT: when pushMerged can't
   * merge this paragraph with its predecessor (different size/align/variant — e.g. a
   * headline followed by body text can't share one <span>'s formatting) but the "no
   * gap" intent still applies, pushMerged sets/confirms it here so the renderer zeroes
   * THIS paragraph's top padding. Paired with tightAfter (set on the PREVIOUS
   * paragraph, zeroing its bottom padding) to approximate a single-<br> gap between
   * two separately-styled blocks.
   */
  tightBefore?: boolean;
  /** Render-only, set by pushMerged — see tightBefore. Zeroes THIS paragraph's bottom padding. */
  tightAfter?: boolean;
  /** Input-only merge signals propagated from the source Paragraph (fromDom.ts) —
   *  consumed by pushMerged, never read at render time. See Paragraph for semantics. */
  marginTopPt?: number;
  marginBottomPt?: number;
  gapBefore?: boolean;
  /** statsGrid cell paragraphs only: cell background + border.
   *  `border` (full per-side spec from the source doc) takes precedence when present — e.g. a
   *  distinguishing divider color on one side (a white border-right between two same-colored
   *  cells) that a single collapsed color would lose; `borderColor` is the single-color fallback. */
  bg?: string;
  border?: BorderSpec;
  borderColor?: string;
}

/** A real <ul>/<ol> — structurally certain from the source (see Paragraph.listItem) —
 *  rendered as an actual list instead of bullet-prefixed flowing text. */
export interface ListProps {
  items: Run[][];  // one entry per <li>, flattened to a single run line (joinLinesWithSpace)
  ordered: boolean;
  /** Copied from Paragraph.listGroupId — pushMerged (classify.ts) compares it alongside
   *  `ordered` so two adjacent-but-different <ul>/<ol> of matching ordered-ness don't get
   *  fused into one list. */
  listGroupId?: number;
}

export interface AlertBandProps {
  lines: Run[][];
  bg: string;
  paraBreaks?: Set<number>;
  border?: BorderSpec;
  /**
   * Nested tables inside the source cell that resolve to a real button (GDocs'
   * h5-in-colored-cell pattern) — rendered as actual buttons instead of being
   * flattened to text. `atLine` is the index into `lines` the button is inserted
   * before (does not itself occupy a `lines` slot).
   */
  buttons?: { atLine: number; props: ButtonBandProps }[];
  /**
   * Nested tables that resolve to their own colored band (e.g. a dark pseudo-button
   * cell inside a dark bordered CTA box) — kept as separate colored rows instead of
   * being flattened to plain text, which would silently drop the inner bg. Same
   * `atLine` convention as `buttons`.
   */
  bands?: { atLine: number; props: AlertBandProps }[];
  /**
   * Images that were direct children of the source cell (GDocs' own <p><span><img></span></p>
   * wrapping means these arrive as standalone nodes, not part of any paragraph's runs) —
   * kept as real <img> rows instead of being silently dropped by the flattener. Same
   * `atLine` convention as `buttons`/`bands`.
   */
  images?: { atLine: number; props: ImageProps }[];
  /**
   * Nested tables that resolve to their own grid/row component (statsGrid, recordRow,
   * progressBar) instead of a button/band/plain-band — kept as a real nested table
   * (own columns/dividers/colors) instead of being flattened to plain sequential text,
   * which would lose the grid structure. Same `atLine` convention as `buttons`/`bands`.
   */
  tables?: { atLine: number; node: ComponentNode }[];
  /** Text alignment from the source cell's paragraphs — defaults to left. */
  align?: Align;
}

export interface ButtonBandProps {
  runs: Run[];
  href: string;
  bg: string;
  radius?: number;             // 0 = no rounding (GDocs table-cell buttons)
  border?: BorderSpec;
}

export interface CalloutLeftProps {
  lines: Run[][];
  accentColor: string;
  /** Author-declared left-border width (see BorderSide.widthPx); token fallback when absent. */
  accentWidthPx?: number;
  /** Author-declared left-border style (see BorderSide.style); "solid" when absent. */
  accentStyle?: "dashed" | "dotted";
  /** Author-declared gap between the accent line and the text (padding-left, falling back
   *  to margin-left — GDocs' quote convention often declares both identically), quantized
   *  to whole px. tok.layout.calloutPadX is the fallback when the source declared neither. */
  accentPadX?: number;
  paraBreaks?: Set<number>;
  bg?: string;
  /** Nested tables that resolve to a real button — same convention as AlertBandProps.buttons,
   *  so a CTA inside a left-accent quote box survives instead of being flattened to text. */
  buttons?: { atLine: number; props: ButtonBandProps }[];
  /** Nested tables that resolve to their own colored band — same convention as AlertBandProps.bands. */
  bands?: { atLine: number; props: AlertBandProps }[];
  /** Images that were direct children of the source cell — same convention as AlertBandProps.images. */
  images?: { atLine: number; props: ImageProps }[];
  /** Nested grid/row tables (statsGrid, recordRow, progressBar) — same convention as AlertBandProps.tables. */
  tables?: { atLine: number; node: ComponentNode }[];
  /**
   * Input-only merge signals for consecutive <p>-with-border-left paragraphs (see
   * Paragraph.border) — consumed by pushMerged's calloutLeft merge case (same boundary
   * rule as plain paragraphs, isGapBoundary), never read at render time. See ParagraphProps
   * for semantics of each field.
   */
  tightNext?: boolean;
  tightBefore?: boolean;
  marginTopPt?: number;
  marginBottomPt?: number;
  gapBefore?: boolean;
}

export interface CalloutBoxProps {
  border: BorderSpec;
  bg?: string;
}

export interface TextDividerProps {
  lines: Run[][];
  align?: Align;
  paraBreaks?: Set<number>;
  ruleColor: string;
  /** Author-declared rule style (see BorderSide.style); "solid" when absent. */
  ruleStyle?: "dashed" | "dotted";
}

export interface StatsGridProps {
  n: number;
  widths?: number[];
  borderColor?: string;
}

export interface RecordCellData {
  lines: Run[][];
  align?: Align;
  bg?: string;
  border?: BorderSpec;
  borderColor?: string;
}

export interface RecordRowData {
  bg?: string;
  cells: RecordCellData[];
}

export interface RecordRowProps {
  rows: RecordRowData[];
  widths?: number[];
  borderColor?: string;
  /** Input-only merge signal propagated from the source TableNode (fromDom.ts) — consumed
   *  by pushMerged's recordRow merge (classify.ts), never read at render time. See
   *  TableNode.gapBefore for semantics. */
  gapBefore?: boolean;
  /** A leading full-width row (GDocs <thead><th colspan=N> title, or a plain <tr> whose
   *  single cell's colspan already spans every column) — kept separate from `rows` instead
   *  of being folded into the N-column grid as a 1-cell row, which would leave that <tr>
   *  with a different physical cell count than every other row in the same flat <table>
   *  (no colspan attribute is emitted, so it silently renders as a misaligned first column
   *  instead of a full-width band). Rendered as its own <tr>, with `rows` wrapped in a
   *  nested table below it — see recordRow() in config/templates.ts. */
  band?: RecordCellData;
}

export interface SplitRowProps {
  left: Run[];
  right: Run[];
}

/**
 * A GDocs single-row, multi-cell table where NO cell has meaningful text content but at
 * least one has a solid non-white fill — e.g. a two-tone "progress" bar (a green segment
 * next to a dark one, proportioned by column width). Distinct from `statsGrid` (which
 * always carries per-cell text): rendered as flush colored blocks with no border/text
 * wrapper, since GDocs' border declarations on these cells are typically just a
 * same-color-as-fill residual, not an intentional divider (see detect/tableBlock.ts).
 */
export interface ProgressBarProps {
  n: number;
  widths?: number[];
  /** Fill color per cell, in column order — same length as `n`. */
  colors: string[];
}

export interface ImageProps {
  src: string;
  alt?: string;
  /** § contract around images: a paragraph ending with § right before this image
   *  (or starting with § right after it) zeroes the adjacent image padding, same
   *  approximation as the cross-style paragraph path in pushMerged. */
  tightBefore?: boolean;
  tightAfter?: boolean;
}

export interface SpacerProps {
  heightPx?: number;
}

/** An `i-r-s`/`i-l-s` wrap (see SideImageWrapNode) — a floated placeholder image
 *  beside the wrapped children. `tightBefore`/`tightAfter` mirror ImageProps'
 *  §-adjacency convention (see classify.ts's cross-kind tightness rules). */
export interface SideImageProps {
  side: "left" | "right";
  tightBefore?: boolean;
  tightAfter?: boolean;
}

/** One colored band inside a bandStack — a single cell's content plus its fill. */
export interface BandStackRow {
  bg: string;
  lines: Run[][];
  paraBreaks?: Set<number>;
  align?: Align;
  /** Source cell border (rare for stacked bands, kept for fidelity). */
  border?: BorderSpec;
}

/**
 * A GDocs single-column, multi-row table where every row is a plain colored fill (no
 * nested buttons/images/borders) — e.g. a dark headline band directly over a red
 * sub-band. Rendered as ONE table (matching the source): a single outer block-padded
 * wrapper around stacked `<td bgcolor>` rows, so the bands sit flush with no external
 * gap between them (a table row has no margin — only each cell's own inner padding).
 * A heterogeneous stack (some transparent/bordered rows) instead falls back to
 * per-cell classification in classify.ts.
 */
export interface BandStackProps {
  rows: BandStackRow[];
}

export type ComponentNode =
  | { kind: "paragraph"; props: ParagraphProps }
  | { kind: "list"; props: ListProps }
  | { kind: "alertBand"; props: AlertBandProps }
  | { kind: "buttonBand"; props: ButtonBandProps }
  | { kind: "calloutLeft"; props: CalloutLeftProps }
  | { kind: "calloutBox"; props: CalloutBoxProps; children: ComponentNode[] }
  | { kind: "textDivider"; props: TextDividerProps }
  | { kind: "statsGrid"; props: StatsGridProps; children: ComponentNode[] }
  | { kind: "recordRow"; props: RecordRowProps }
  | { kind: "splitRow"; props: SplitRowProps }
  | { kind: "progressBar"; props: ProgressBarProps }
  | { kind: "image"; props: ImageProps }
  | { kind: "bandStack"; props: BandStackProps }
  | { kind: "sideImage"; props: SideImageProps; children: ComponentNode[] }
  | { kind: "spacer"; props: SpacerProps };

export type ComponentKind = ComponentNode["kind"];
