export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  href?: string;
  oneBr?: true;
}
export interface Paragraph {
  type: "p";
  align?: Align;
  size: SizeRole;
  headingLevel?: number;
  accent?: boolean;
  bg?: string;
  border?: BorderSpec;
  accentPadX?: number;
  lines: Run[][];
  paraBreaks?: Set<number>;
  listItem?: boolean;
  ordered?: boolean;
  listGroupId?: number;
  tightNext?: boolean;
  tightBefore?: boolean;
  marginTopPt?: number;
  marginBottomPt?: number;
  gapBefore?: boolean;
}
export interface ImageNode {
  type: "img";
  src: string;
  alt?: string;
}
export interface BorderSide {
  color: string;
  widthPx?: number;
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
  border?: BorderSpec;
  align?: Align;
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
  colWidths?: number[];
  gapBefore?: boolean;
}
export interface SideImageWrapNode {
  type: "sideImageWrap";
  side: ImageSide;
  children: StructuralNode[];
  tightBefore?: boolean;
}
export interface FooterNode {
  type: "footer";
  align: Align;
  lines: Run[][];
  paraBreaks?: Set<number>;
}
export interface SignatureNode {
  type: "signature";
}
export type WarnFn = (message: string) => void;
export type StructuralNode =
  | TableNode
  | RowNode
  | CellNode
  | Paragraph
  | ImageNode
  | SideImageWrapNode
  | FooterNode
  | SignatureNode;
export type Align = "left" | "center" | "right";
export type ImageSide = "left" | "right";
export type SizeRole = "body" | "small" | "headline";
export interface ParagraphProps {
  lines: Run[][];
  size: SizeRole;
  align?: Align;
  variant?: "quote";
  paraBreaks?: Set<number>;
  lists?: {
    atLine: number;
    props: ListProps;
  }[];
  tightNext?: boolean;
  tightBefore?: boolean;
  tightAfter?: boolean;
  marginTopPt?: number;
  marginBottomPt?: number;
  gapBefore?: boolean;
  bg?: string;
  border?: BorderSpec;
  borderColor?: string;
}
export interface ListProps {
  items: Run[][];
  ordered: boolean;
  listGroupId?: number;
}
export interface AlertBandProps {
  lines: Run[][];
  bg: string;
  paraBreaks?: Set<number>;
  border?: BorderSpec;
  buttons?: {
    atLine: number;
    props: ButtonBandProps;
  }[];
  bands?: {
    atLine: number;
    props: AlertBandProps;
  }[];
  images?: {
    atLine: number;
    props: ImageProps;
  }[];
  tables?: {
    atLine: number;
    node: ComponentNode;
  }[];
  align?: Align;
}
export interface ButtonBandProps {
  runs: Run[];
  href: string;
  bg: string;
  radius?: number;
  border?: BorderSpec;
}
export interface CalloutLeftProps {
  lines: Run[][];
  accentColor: string;
  accentWidthPx?: number;
  accentStyle?: "dashed" | "dotted";
  accentPadX?: number;
  paraBreaks?: Set<number>;
  bg?: string;
  buttons?: {
    atLine: number;
    props: ButtonBandProps;
  }[];
  bands?: {
    atLine: number;
    props: AlertBandProps;
  }[];
  images?: {
    atLine: number;
    props: ImageProps;
  }[];
  tables?: {
    atLine: number;
    node: ComponentNode;
  }[];
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
  gapBefore?: boolean;
  band?: RecordCellData;
}
export interface SplitRowProps {
  left: Run[];
  right: Run[];
}
export interface ProgressBarProps {
  n: number;
  widths?: number[];
  colors: string[];
}
export interface ImageProps {
  src: string;
  alt?: string;
  tightBefore?: boolean;
  tightAfter?: boolean;
}
export interface SpacerProps {
  heightPx?: number;
}
export interface SideImageProps {
  side: ImageSide;
  tightBefore?: boolean;
  tightAfter?: boolean;
}
export interface BandStackRow {
  bg: string;
  lines: Run[][];
  paraBreaks?: Set<number>;
  align?: Align;
  border?: BorderSpec;
}
export interface BandStackProps {
  rows: BandStackRow[];
}
export interface FooterProps {
  align: Align;
  lines: Run[][];
  paraBreaks?: Set<number>;
}
export type ComponentNode =
  | {
      kind: "paragraph";
      props: ParagraphProps;
    }
  | {
      kind: "list";
      props: ListProps;
    }
  | {
      kind: "alertBand";
      props: AlertBandProps;
    }
  | {
      kind: "buttonBand";
      props: ButtonBandProps;
    }
  | {
      kind: "calloutLeft";
      props: CalloutLeftProps;
    }
  | {
      kind: "calloutBox";
      props: CalloutBoxProps;
      children: ComponentNode[];
    }
  | {
      kind: "textDivider";
      props: TextDividerProps;
    }
  | {
      kind: "statsGrid";
      props: StatsGridProps;
      children: ComponentNode[];
    }
  | {
      kind: "recordRow";
      props: RecordRowProps;
    }
  | {
      kind: "splitRow";
      props: SplitRowProps;
    }
  | {
      kind: "progressBar";
      props: ProgressBarProps;
    }
  | {
      kind: "image";
      props: ImageProps;
    }
  | {
      kind: "bandStack";
      props: BandStackProps;
    }
  | {
      kind: "sideImage";
      props: SideImageProps;
      children: ComponentNode[];
    }
  | {
      kind: "spacer";
      props: SpacerProps;
    }
  | {
      kind: "footer";
      props: FooterProps;
    }
  | {
      kind: "signature";
    };
export type ComponentKind = ComponentNode["kind"];
