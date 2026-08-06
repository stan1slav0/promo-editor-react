import { escapeHtml } from "../core"
import { isDarkBg } from "../ir/color"
import type { Align, BorderSpec, ImageSide, Run, SizeRole } from "../ir/types"
import type { Tokens } from "./tokens"
import { tokens as defaultTokens } from "./tokens"
export type { Run }
export interface ParagraphOpts {
  innerHtml: string
  align?: Align
  size: SizeRole
  variant?: "quote"
  tightAfter?: boolean
  tightBefore?: boolean
}
export interface ListOpts {
  ordered: boolean
}
export interface AlertBandOpts {
  bg: string
  border?: BorderSpec
  align?: Align
  innerHtml?: string
  segments?: AlertBandSegment[]
  rows?: string[]
}
export interface BandStackRowOpt {
  bg: string
  innerHtml: string
  align?: Align
  border?: BorderSpec
}
export interface BandStackOpts {
  rows: BandStackRowOpt[]
}
export type AlertBandSegment =
  | {
    kind: "text"
    html: string
  }
  | {
    kind: "button"
    label: string
    href: string
    bg: string
    radius?: number
    border?: BorderSpec
  }
  | {
    kind: "band"
    html: string
    bg: string
    border?: BorderSpec
    align?: Align
  }
  | {
    kind: "image"
    props: ImageOpts
  }
export interface ButtonBandOpts {
  bg: string
  href: string
  innerHtml: string
  subtitleHtml?: string
  radius?: number
  border?: BorderSpec
}
export interface CalloutOpts {
  accentColor: string
  accentWidthPx?: number
  accentStyle?: "dashed" | "dotted"
  accentPadX?: number
  bg?: string
  segments?: AlertBandSegment[]
  rows?: string[]
}
export interface CalloutBoxOpts {
  border: BorderSpec
  bg?: string
  innerHtml?: string
  align?: Align
}
export interface TextDividerOpts {
  align?: Align
  ruleColor: string
  ruleStyle?: "dashed" | "dotted"
}
export interface GridCell {
  innerHtml: string
  bg?: string
  border?: BorderSpec
  borderColor?: string
  align?: Align
}
export interface GridOpts {
  n: number
  widths?: number[]
  borderColor?: string
  padX?: number
}
export interface ImageOpts {
  src?: string
  alt?: string
  tightBefore?: boolean
  tightAfter?: boolean
}
export interface FooterOpts {
  align: Align
}
export interface SideImageOpts {
  side: ImageSide
  align?: Align
  tightBefore?: boolean
  tightAfter?: boolean
}
export interface SplitRowOpts {
  leftHtml: string
  rightHtml: string
}
export interface ProgressBarOpts {
  n: number
  widths?: number[]
  colors: string[]
  padX?: number
}
export interface RecordOpts {
  widths?: number[]
  borderColor?: string
  band?: {
    innerHtml: string
    align?: Align
    bg?: string
    border?: BorderSpec
    borderColor?: string
  }
  padX?: number
  rows: Array<{
    bg?: string
    cells: Array<{
      innerHtml: string
      align?: Align
      bg?: string
      border?: BorderSpec
      borderColor?: string
    }>
  }>
}
export function indentHtml(html: string, spaces: number): string {
  if (!html) return html
  const pad = " ".repeat(spaces)
  return html
    .split("\n")
    .map((line) => (line.length ? pad + line : line))
    .join("\n")
}
function resolveColumnWidths(
  itemCount: number,
  divisor: number,
  provided?: number[],
  requireExactLength = false,
): number[] {
  const widths =
    requireExactLength && provided?.length !== itemCount ? undefined : provided
  const percent = Math.floor(100 / divisor)
  return Array.from({ length: itemCount }, (_, index) =>
    widths?.[index] !== undefined
      ? widths[index]
      : index === itemCount - 1
        ? 100 - percent * (itemCount - 1)
        : percent,
  )
}
export function baseStyle(
  opts: {
    align?: Align
    fontSize?: number
    fontWeight?: string
    color?: string
    extraStyle?: string
  } = {},
  tok: Tokens = defaultTokens,
): string {
  const {
    align = "left",
    fontSize = tok.font.bodyPx,
    fontWeight = "normal",
    color = tok.color.black,
    extraStyle = "",
  } = opts
  return `font-family:${tok.font.stack};font-size:${fontSize}px;font-style:normal;font-weight:${fontWeight};line-height:${tok.font.lineHeight};text-align:${align};color:${color};${extraStyle}`
}
export function wrapBlockStyle(
  innerHtml: string,
  style: string,
  tok: Tokens = defaultTokens,
): string {
  const tag = tok.tags.blockWrap
  return `<${tag} style="${style}">
${indentHtml(innerHtml, 2)}
</${tag}>`
}
export function blockRow(
  innerHtml: string,
  opts: Parameters<typeof baseStyle>[0] & {
    padY?: number
    padTop?: number
    padBottom?: number
  } = {},
  tok: Tokens = defaultTokens,
): string {
  const {
    padY = tok.layout.blockPadY,
    padTop = padY,
    padBottom = padY,
    extraStyle,
    ...coreOpts
  } = opts
  const align = coreOpts.align ?? "left"
  const spanStyle = baseStyle(coreOpts, tok)
  const tdExtra = extraStyle ? ` ${extraStyle}` : ""
  const tag =
    coreOpts.fontWeight === "bold" ? tok.tags.headlineWrap : tok.tags.blockWrap
  return `<tr>
  <td align="${align}"
    style="${spanStyle}${tdExtra} padding-top:${padTop}px;padding-bottom:${padBottom}px;">
    <${tag} style="${spanStyle}">
${indentHtml(innerHtml, 6)}
    </${tag}>
  </td>
</tr>`
}
type NeighborBg = Partial<Record<keyof BorderSpec, string | undefined>>
function dropBgMatchingSides(
  border: BorderSpec | undefined,
  bg: string | undefined,
  neighborBg?: NeighborBg,
): BorderSpec | undefined {
  if (!border) return border
  const filtered: BorderSpec = {}
  for (const side of ["top", "right", "bottom", "left"] as const) {
    const s = border[side]
    if (!s) continue
    const blendsIntoOwn = bg !== undefined && s.color === bg
    const blendsIntoNeighbor =
      neighborBg?.[side] !== undefined && s.color === neighborBg[side]
    if (!blendsIntoOwn && !blendsIntoNeighbor) filtered[side] = s
  }
  return Object.values(filtered).some(Boolean) ? filtered : undefined
}
export function borderSpecToStyle(
  border: BorderSpec | undefined,
  tok: Tokens = defaultTokens,
  widthPx?: number,
): string {
  if (!border) return ""
  const bw = widthPx ?? tok.layout.calloutBoxBorderPx
  const sides: Array<[keyof BorderSpec, string]> = [
    ["top", "border-top"],
    ["right", "border-right"],
    ["bottom", "border-bottom"],
    ["left", "border-left"],
  ]
  const present = sides.filter(([key]) => border[key])
  const sideCss = (key: keyof BorderSpec) => {
    const s = border[key]!
    return `${s.widthPx ?? bw}px ${s.style ?? "solid"} ${s.color}`
  }
  if (present.length === 4) {
    const counts = new Map<string, number>()
    for (const [key] of present) {
      const css = sideCss(key)
      counts.set(css, (counts.get(css) ?? 0) + 1)
    }
    let modeCss = sideCss(present[0][0])
    let modeCount = 0
    for (const [key] of present) {
      const css = sideCss(key)
      const count = counts.get(css)!
      if (count > modeCount) {
        modeCss = css
        modeCount = count
      }
    }
    if (modeCount === 4) {
      return `border:${modeCss};`
    }
    if (modeCount >= 2) {
      const overrides = present
        .filter(([key]) => sideCss(key) !== modeCss)
        .map(([key, prop]) => `${prop}:${sideCss(key)};`)
        .join("")
      return `border:${modeCss};${overrides}`
    }
  }
  return present.map(([key, prop]) => `${prop}:${sideCss(key)};`).join("")
}
export function buttonTableHtml(
  label: string,
  href: string,
  bg: string,
  tok: Tokens = defaultTokens,
  radiusOverride?: number,
  border?: BorderSpec,
): string {
  const { height, padding, innerPadding, target } = tok.button
  const r = radiusOverride !== undefined ? radiusOverride : tok.button.radius
  const radiusStyle = r > 0 ? `border-radius:${r}px;` : ""
  const borderStyle = borderSpecToStyle(dropBgMatchingSides(border, bg), tok)
  const textColor = isDarkBg(bg, tok) ? tok.color.white : tok.color.black
  const style = baseStyle(
    { align: "center", fontWeight: "bold", color: textColor },
    tok,
  )
  const safeHref = escapeHtml(href)
  return `<table cellpadding="0" cellspacing="0" role="presentation" width="100%" style="width:100%;max-width:100%;">
  <tr>
    <td class="${tok.classes.btnWrap}" height="${height}" align="center" bgcolor="${bg}"
      style="${style} padding:${padding};background-color:${bg};${radiusStyle}${borderStyle}">
      <a href="${safeHref}" target="${target}"
        style="text-decoration:${tok.button.textDecoration};padding:${innerPadding};display:block;${style}background-color:${bg};${radiusStyle}">
${indentHtml(label, 8)}
      </a>
    </td>
  </tr>
</table>`
}
export function imageRowHtml(
  opts: ImageOpts,
  tok: Tokens = defaultTokens,
  padX = 0,
): string {
  const { tightBefore, tightAfter } = opts
  const padTop = tightBefore ? 0 : tok.layout.blockPadY
  const padBottom = tightAfter ? 0 : tok.layout.blockPadY
  const w = tok.layout.placeholderImageWidth - 2 * padX
  const padXCss = padX ? `padding-left:${padX}px;padding-right:${padX}px;` : ""
  const src = opts.src || tok.placeholderImageSrc
  const alt = opts.alt ?? tok.placeholderImageAlt
  return `<tr>
  <td class="${tok.classes.imgBg}" align="center" style="padding-top:${padTop}px;padding-bottom:${padBottom}px;${padXCss}">
    <a href="${tok.placeholderHref}" target="${tok.button.target}">
      <img alt="${escapeHtml(alt)}" height="auto" src="${escapeHtml(src)}" width="${w}"
        style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:100%;max-width:${w}px;font-size:13px;"/>
    </a>
  </td>
</tr>`
}
export function buildSegmentRows(
  segments: AlertBandSegment[],
  align: Align,
  textColor: string,
  tok: Tokens = defaultTokens,
): string {
  const p = tok.layout.blockPadY
  return segments
    .map((seg) => {
      if (seg.kind === "button") {
        const btnTable = buttonTableHtml(
          seg.label,
          seg.href,
          seg.bg,
          tok,
          seg.radius,
          seg.border,
        )
        return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
${indentHtml(btnTable, 4)}
  </td>
</tr>`
      }
      if (seg.kind === "band") {
        const bandColor = isDarkBg(seg.bg, tok)
          ? tok.color.white
          : tok.color.black
        const bandStyle = baseStyle(
          { align: seg.align ?? "left", color: bandColor },
          tok,
        )
        const bandBorder = borderSpecToStyle(
          dropBgMatchingSides(seg.border, seg.bg),
          tok,
        )
        const bh = tok.layout.alertBandPadH
        const bv = tok.layout.alertBandPadV
        return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0" bgcolor="${seg.bg}" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;${bandBorder}" role="presentation">
      <tr>
        <td style="${bandStyle} padding-left:${bh}px;padding-right:${bh}px;padding-top:${bv}px;padding-bottom:${bv}px;">
${indentHtml(seg.html, 10)}
        </td>
      </tr>
    </table>
  </td>
</tr>`
      }
      if (seg.kind === "image") {
        return imageRowHtml(seg.props, tok)
      }
      return blockRow(seg.html, { align, color: textColor }, tok)
    })
    .join("\n")
}
export function buildTemplates(tok: Tokens = defaultTokens) {
  const pad = () => tok.layout.blockPadY
  return {
    document(content: string): string {
      const { sidePadding: sp, spacerPx, containerMaxWidth: maxW } = tok.layout
      const { primaryTable, verticalSpace, innerTable, spacer } = tok.classes
      return `<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:100%;">
  <tr>
    <td align="center" valign="top">
      <table class="${primaryTable}" bgcolor="${tok.color.rootBackground}" border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" style="max-width:${maxW}px;">
        <tr>
          <td class="${verticalSpace}" align="center" style="padding-left:${sp}px;padding-right:${sp}px;">
            <table class="${innerTable}" border="0" cellspacing="0" role="presentation" cellpadding="0" width="100%" style="width:100%;">
              <tr><td height="${spacerPx}" width="100%" style="max-width:100%" class="${spacer}">&#160;</td></tr>
${indentHtml(content, 14)}
              <tr><td height="${spacerPx}" width="100%" style="max-width:100%" class="${spacer}">&#160;</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
    },
    spacer(heightPx: number): string {
      return `<tr><td height="${heightPx}" width="100%" style="max-width:100%" class="${tok.classes.spacer}">&#160;</td></tr>`
    },
    paragraph(opts: ParagraphOpts): string {
      const {
        innerHtml,
        align = "left",
        size,
        variant,
        tightAfter,
        tightBefore,
      } = opts
      const fontSize =
        size === "headline"
          ? tok.font.headlinePx
          : size === "small"
            ? tok.font.smallPx
            : tok.font.bodyPx
      const fontWeight = size === "headline" ? "bold" : "normal"
      const qp = variant === "quote" ? tok.layout.quotePadX : 0
      const extraStyle = qp
        ? `padding-left:${qp}px;padding-right:${qp}px;`
        : ""
      const padTop = tightBefore ? 0 : undefined
      const padBottom = tightAfter ? 0 : undefined
      return blockRow(
        innerHtml,
        { align, fontSize, fontWeight, extraStyle, padTop, padBottom },
        tok,
      )
    },
    list(itemsHtml: string, opts: ListOpts): string {
      const { ordered } = opts
      const tag = ordered ? "ol" : "ul"
      const style = baseStyle({}, tok)
      const p = pad()
      const indent = tok.layout.listIndentPx
      return `<tr>
  <td style="${style} padding-top:${p}px;padding-bottom:${p}px;">
    <${tag} style="margin:0;padding-left:${indent}px;">
${indentHtml(itemsHtml, 6)}
    </${tag}>
  </td>
</tr>`
    },
    alertBand(opts: AlertBandOpts): string {
      const { innerHtml, segments, rows, bg, border, align = "left" } = opts
      const textColor = isDarkBg(bg, tok) ? tok.color.white : tok.color.black
      const p = pad()
      const borderStyle = borderSpecToStyle(
        dropBgMatchingSides(border, bg),
        tok,
      )
      if (rows) {
        return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0" bgcolor="${bg}" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;${borderStyle}" role="presentation">
${indentHtml(rows.join("\n"), 6)}
    </table>
  </td>
</tr>`
      }
      if (segments) {
        const sp = tok.layout.sidePadding
        const rowsHtml = buildSegmentRows(segments, align, textColor, tok)
        return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0" bgcolor="${bg}" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;${borderStyle}" role="presentation">
      <tr>
        <td align="center" style="padding-left:${sp}px;padding-right:${sp}px;">
          <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;" role="presentation">
${indentHtml(rowsHtml, 12)}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
      }
      const style = baseStyle({ align, color: textColor }, tok)
      const ph = tok.layout.alertBandPadH
      const pv = tok.layout.alertBandPadV
      return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0" bgcolor="${bg}" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;${borderStyle}" role="presentation">
      <tr>
        <td style="${style} padding-left:${ph}px;padding-right:${ph}px;padding-top:${pv}px;padding-bottom:${pv}px;">
${indentHtml(wrapBlockStyle(innerHtml!, style, tok), 10)}
        </td>
      </tr>
    </table>
  </td>
</tr>`
    },
    bandStack(opts: BandStackOpts): string {
      const p = pad()
      const ph = tok.layout.alertBandPadH
      const pv = tok.layout.alertBandPadV
      const rowsHtml = opts.rows
        .map((r) => {
          const textColor = isDarkBg(r.bg, tok)
            ? tok.color.white
            : tok.color.black
          const style = baseStyle(
            { align: r.align ?? "left", color: textColor },
            tok,
          )
          const borderStyle = borderSpecToStyle(
            dropBgMatchingSides(r.border, r.bg),
            tok,
          )
          return `<tr>
  <td bgcolor="${r.bg}" style="${style} padding-left:${ph}px;padding-right:${ph}px;padding-top:${pv}px;padding-bottom:${pv}px;${borderStyle}">
${indentHtml(wrapBlockStyle(r.innerHtml, style, tok), 4)}
  </td>
</tr>`
        })
        .join("\n")
      return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;" role="presentation">
${indentHtml(rowsHtml, 6)}
    </table>
  </td>
</tr>`
    },
    calloutLeft(innerHtml: string, opts: CalloutOpts): string {
      const { accentColor, bg, segments, rows } = opts
      const style = baseStyle({}, tok)
      const p = pad()
      const px = opts.accentPadX ?? tok.layout.calloutPadX
      const accent = opts.accentWidthPx ?? tok.layout.calloutAccentPx
      const accentStyle = opts.accentStyle ?? "solid"
      const bgAttr = bg ? ` bgcolor="${bg}"` : ""
      const bgStyle = bg ? `background-color:${bg};` : ""
      const accentBorder =
        accentColor === bg
          ? ""
          : `border-left:${accent}px ${accentStyle} ${accentColor};`
      if (rows) {
        return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0"${bgAttr} cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;${bgStyle}${accentBorder}" role="presentation">
${indentHtml(rows.join("\n"), 6)}
    </table>
  </td>
</tr>`
      }
      const wrapOpen = `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0"${bgAttr} cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;${bgStyle}${accentBorder}" role="presentation">
      <tr>`
      const wrapClose = `      </tr>
    </table>
  </td>
</tr>`
      if (segments) {
        return `${wrapOpen}
        <td align="left" style="padding-left:${px}px;padding-right:${px}px;">
          <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;" role="presentation">
${indentHtml(buildSegmentRows(segments, "left", tok.color.black, tok), 12)}
          </table>
        </td>
${wrapClose}`
      }
      return `${wrapOpen}
        <td align="left"
          style="${style} padding-left:${px}px;padding-right:${px}px;padding-top:${p}px;padding-bottom:${p}px;">
${indentHtml(wrapBlockStyle(innerHtml, style, tok), 10)}
        </td>
${wrapClose}`
    },
    calloutBox(childrenHtml: string | undefined, opts: CalloutBoxOpts): string {
      const { border, bg, innerHtml, align = "left" } = opts
      const borderStyle = borderSpecToStyle(
        dropBgMatchingSides(border, bg),
        tok,
      )
      const p = pad()
      const px = tok.layout.calloutPadX
      const bgAttr = bg ? ` bgcolor="${bg}"` : ""
      const bgStyle = bg ? `background-color:${bg};` : ""
      const wrapOpen = `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0"${bgAttr} cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;${bgStyle}${borderStyle}" role="presentation">
      <tr>`
      const wrapClose = `      </tr>
    </table>
  </td>
</tr>`
      if (innerHtml !== undefined) {
        const style = baseStyle({ align }, tok)
        return `${wrapOpen}
        <td align="${align}"
          style="${style} padding-top:${p}px;padding-bottom:${p}px;padding-left:${px}px;padding-right:${px}px;">
${indentHtml(wrapBlockStyle(innerHtml, style, tok), 10)}
        </td>
${wrapClose}`
      }
      return `${wrapOpen}
        <td style="padding-left:${px}px;padding-right:${px}px;">
          <table border="0" cellspacing="0" cellpadding="0" width="100%" role="presentation" style="width:100%;">
${indentHtml(childrenHtml!, 12)}
          </table>
        </td>
${wrapClose}`
    },
    textDivider(innerHtml: string, opts: TextDividerOpts): string {
      const { align = "left", ruleColor, ruleStyle = "solid" } = opts
      const textRow = blockRow(innerHtml, { align }, tok)
      const p = pad()
      return `${textRow}
<tr>
  <td height="1" style="font-size:1px;line-height:1px;border-bottom:1px ${ruleStyle} ${ruleColor};padding-bottom:${p}px;">&#160;</td>
</tr>`
    },
    buttonBand(opts: ButtonBandOpts): string {
      const { innerHtml, href, bg, subtitleHtml, radius, border } = opts
      const p = pad()
      const subtitle = subtitleHtml
        ? `\n<tr>\n  <td align="center" style="padding-top:${tok.layout.buttonSubtitlePadTop}px;">${subtitleHtml}</td>\n</tr>`
        : ""
      return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
${indentHtml(buttonTableHtml(innerHtml, href, bg, tok, radius, border), 4)}
  </td>
</tr>${subtitle}`
    },
    statsGrid(cells: GridCell[], opts: GridOpts): string {
      const { n, widths, borderColor, padX } = opts
      const resolvedWidths = resolveColumnWidths(cells.length, n, widths)
      const p = pad()
      const padXCss = padX
        ? `padding-left:${padX}px;padding-right:${padX}px;`
        : ""
      const cy = tok.layout.gridCellPadY
      const cx = tok.layout.gridCellPadX
      const wraps = n > tok.layout.gridInlineBlockThreshold
      const cellsHtml = cells
        .map((cell, i) => {
          const w = resolvedWidths[i]
          const textColor =
            cell.bg && isDarkBg(cell.bg, tok)
              ? tok.color.white
              : tok.color.black
          const cellStyle = baseStyle(
            {
              align: cell.align ?? tok.statsGridDefaultAlign,
              fontSize: tok.font.cellPx,
              color: textColor,
            },
            tok,
          )
          const bgAttr = cell.bg ? ` bgcolor="${cell.bg}"` : ""
          const bgStyle = cell.bg ? `background-color:${cell.bg};` : ""
          const rawBorderColor = cell.borderColor ?? borderColor
          const effectiveBorderColor =
            rawBorderColor && rawBorderColor !== cell.bg
              ? rawBorderColor
              : undefined
          const cellBorder = dropBgMatchingSides(cell.border, cell.bg)
          const borderCss = cellBorder
            ? borderSpecToStyle(cellBorder, tok, tok.layout.recordBorderPx)
            : effectiveBorderColor
              ? `border:${tok.layout.recordBorderPx}px solid ${effectiveBorderColor};`
              : ""
          const cellClass = wraps ? ` class="${tok.classes.inlineCell}"` : ""
          const cellStyleAttr = wraps
            ? `display:inline-block;width:${w}%;max-width:100%;min-width:${tok.layout.gridMinWidth}px;`
            : `width:${w}%;max-width:100%;`
          return `<td valign="top" align="center"${cellClass} width="${w}%"${bgAttr}
  style="${cellStyleAttr}">
  <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" style="width:100%;${borderCss}${bgStyle} min-height: 50px;">
    <tr>
      <td style="${cellStyle} padding-top:${cy}px;padding-right:${cx}px;padding-bottom:${cy}px;padding-left:${cx}px;">
${indentHtml(wrapBlockStyle(cell.innerHtml, cellStyle, tok), 8)}
      </td>
    </tr>
  </table>
</td>`
        })
        .join("\n")
      return `<tr>
  <td style="padding-top:${p}px;padding-bottom:${p}px;${padXCss}">
    <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%"
      style="width:100%;min-width:100%;font-size:0;line-height:0;mso-line-height-rule:exactly;text-align:center;">
      <tr>
${indentHtml(cellsHtml, 8)}
      </tr>
    </table>
  </td>
</tr>`
    },
    splitRow(opts: SplitRowOpts): string {
      const { leftHtml, rightHtml } = opts
      const style = baseStyle(
        { align: "left", fontSize: tok.font.bodyPx },
        tok,
      )
      const p = pad()
      const cx = tok.layout.recordCellPadX
      const tag = tok.tags.blockWrap
      return `<tr>
  <td align="center" style="padding-top:${p}px;padding-bottom:${p}px;">
    <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;" role="presentation">
      <tr>
        <td style="${style} padding-right:${cx}px;padding-left:${cx}px;">
          <${tag} style="${style}">${leftHtml}</${tag}>
        </td>
        <td align="right">
          <table align="right" border="0" cellspacing="0" cellpadding="0" style="padding:0;margin:0;" role="presentation">
            <tr>
              <td style="${style} padding-right:${cx}px;padding-left:${cx}px;">
                <${tag} style="${style}">${rightHtml}</${tag}>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
    },
    progressBar(opts: ProgressBarOpts): string {
      const { n, widths, colors, padX } = opts
      const resolvedWidths = resolveColumnWidths(colors.length, n, widths)
      const p = pad()
      const padXCss = padX
        ? `padding-left:${padX}px;padding-right:${padX}px;`
        : ""
      const barTop = tok.layout.progressBarPadTopPx
      const cellsHtml = colors
        .map((color, i) => {
          const w = resolvedWidths[i]
          return `<td bgcolor="${color}" width="${w}%" style="width:${w}%;padding-top:${barTop}px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&#160;</td>`
        })
        .join("\n")
      return `<tr>
  <td style="padding-top:${p}px;padding-bottom:${p}px;${padXCss}">
    <table align="center" border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;">
      <tr>
${indentHtml(cellsHtml, 8)}
      </tr>
    </table>
  </td>
</tr>`
    },
    image(opts: ImageOpts): string {
      return imageRowHtml(opts, tok)
    },
    footer(innerHtml: string, opts: FooterOpts): string {
      return blockRow(
        innerHtml,
        {
          align: opts.align,
          fontSize: tok.font.smallPx,
          padTop: tok.layout.footerPadTopPx,
          padBottom: tok.layout.footerPadBottomPx,
        },
        tok,
      )
    },
    signature(): string {
      const width = tok.layout.signatureImageWidthPx
      const padding = tok.layout.blockPadY
      return `<tr>
  <td class="${tok.classes.signatureImg}" align="left" style="padding-top:${padding}px;padding-bottom:${padding}px;">
    <img alt="${escapeHtml(tok.signatureImageAlt)}" src="${escapeHtml(tok.signatureImageSrc)}" width="${width}"
      style="border:0;display:block;outline:none;text-decoration:none;height:auto;width:${width}px;max-width:100%;font-size:13px;"/>
  </td>
</tr>`
    },
    sideImage(innerHtml: string, opts: SideImageOpts): string {
      const { side, align = "left", tightBefore, tightAfter } = opts
      const padTop = tightBefore ? 0 : pad()
      const padBottom = tightAfter ? 0 : pad()
      const style = baseStyle({ align }, tok)
      const w = tok.layout.sideImageWidthPx
      const h = tok.layout.sideImageHeightPx
      const marginSide = side === "right" ? "margin-left" : "margin-right"
      return `<tr>
  <td align="left" style="padding-top:${padTop}px;padding-bottom:${padBottom}px;">
    <a align="${side}" href="${tok.placeholderHref}" target="${tok.button.target}" style="display:inline-block;float:${side};width:50%;max-width:50%;${marginSide}:18px;margin-bottom:12px;">
      <img alt="${escapeHtml(tok.placeholderImageAlt)}" height="${h}" align="${side}" src="${escapeHtml(tok.placeholderImageSrc)}" width="${w}"
        style="border:0;display:inline-block;outline:none;text-decoration:none;height:auto;max-height:${h}px;max-width:100%;width:100%;font-size:13px;object-fit:contain;"/>
    </a>
    <${tok.tags.blockWrap} style="${style}">
${indentHtml(innerHtml, 6)}
    </${tok.tags.blockWrap}>
  </td>
</tr>`
    },
    recordRow(opts: RecordOpts): string {
      const { rows, widths, borderColor, band, padX } = opts
      if (!rows.length) return ""
      const p = pad()
      const padXCss = padX
        ? `padding-left:${padX}px;padding-right:${padX}px;`
        : ""
      const ry = tok.layout.recordCellPadY
      const rx = tok.layout.recordCellPadX
      const nrows = rows.length
      const cellBgAt = (rowIdx: number, colIdx: number): string | undefined => {
        const r = rows[rowIdx]
        const c = r?.cells[colIdx]
        return c ? (c.bg ?? r.bg) : undefined
      }
      const rowsHtml = rows
        .map((row, rowIdx) => {
          const rowTextColor =
            row.bg && isDarkBg(row.bg, tok) ? tok.color.white : tok.color.black
          const ncols = row.cells.length
          const rowWidths = resolveColumnWidths(ncols, ncols, widths, true)
          const isLastRow = rowIdx === nrows - 1
          const cellsHtml = row.cells
            .map((cell, i) => {
              const bg = cell.bg ?? row.bg
              const bgAttr = bg ? ` bgcolor="${bg}"` : ""
              const textColor =
                bg && isDarkBg(bg, tok) ? tok.color.white : rowTextColor
              const align = cell.align ?? "left"
              const style = baseStyle(
                { align, fontSize: tok.font.cellPx, color: textColor },
                tok,
              )
              const w = rowWidths[i]
              const widthAttr = ncols > 1 ? ` width="${w}%"` : ""
              const isLastCol = i === ncols - 1
              const neighborBg: NeighborBg = {
                left: i > 0 ? cellBgAt(rowIdx, i - 1) : undefined,
                right: i < ncols - 1 ? cellBgAt(rowIdx, i + 1) : undefined,
                top: rowIdx > 0 ? cellBgAt(rowIdx - 1, i) : band?.bg,
                bottom:
                  rowIdx < nrows - 1 ? cellBgAt(rowIdx + 1, i) : undefined,
              }
              const cellBorder = dropBgMatchingSides(
                cell.border,
                bg,
                neighborBg,
              )
              const hasExplicitBorder =
                cellBorder && Object.values(cellBorder).some(Boolean)
              const rawBorderColor = cell.borderColor ?? borderColor
              const effectiveBorderColor =
                rawBorderColor &&
                  rawBorderColor !== bg &&
                  rawBorderColor !== neighborBg.bottom
                  ? rawBorderColor
                  : undefined
              const drawBottom =
                Boolean(cellBorder?.bottom) && (isLastRow || !cellBorder?.top)
              const drawRight =
                Boolean(cellBorder?.right) && (isLastCol || !cellBorder?.left)
              const borderStyle = hasExplicitBorder
                ? borderSpecToStyle(
                  {
                    top: cellBorder!.top,
                    left: cellBorder!.left,
                    bottom: drawBottom ? cellBorder!.bottom : undefined,
                    right: drawRight ? cellBorder!.right : undefined,
                  },
                  tok,
                  tok.layout.recordBorderPx,
                )
                : effectiveBorderColor
                  ? `border-bottom:${tok.layout.recordBorderPx}px solid ${effectiveBorderColor};`
                  : ""
              return `<td align="${align}"${bgAttr}${widthAttr}
  style="${style} padding-top:${ry}px;padding-right:${rx}px;padding-bottom:${ry}px;padding-left:${rx}px;${borderStyle}">
${indentHtml(wrapBlockStyle(cell.innerHtml, style, tok), 2)}
</td>`
            })
            .join("\n")
          return `<tr>
${indentHtml(cellsHtml, 2)}
</tr>`
        })
        .join("\n")
      if (!band) {
        return `<tr>
  <td style="padding-top:${p}px;padding-bottom:${p}px;${padXCss}">
    <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" style="width:100%;border-collapse:collapse;">
${indentHtml(rowsHtml, 6)}
    </table>
  </td>
</tr>`
      }
      const bandTextColor =
        band.bg && isDarkBg(band.bg, tok) ? tok.color.white : tok.color.black
      const bandAlign = band.align ?? "left"
      const bandStyle = baseStyle(
        { align: bandAlign, fontSize: tok.font.cellPx, color: bandTextColor },
        tok,
      )
      const bandBgAttr = band.bg ? ` bgcolor="${band.bg}"` : ""
      const firstRow = rows[0]
      const firstRowBg = cellBgAt(0, 0)
      const firstRowUniformBg = firstRow.cells.every(
        (_, colIdx) => cellBgAt(0, colIdx) === firstRowBg,
      )
        ? firstRowBg
        : undefined
      const bandBorder = dropBgMatchingSides(band.border, band.bg, {
        bottom: firstRowUniformBg,
      })
      const bandHasExplicitBorder =
        bandBorder && Object.values(bandBorder).some(Boolean)
      const bandRawBorderColor = band.borderColor
      const bandBorderColor =
        bandRawBorderColor &&
          bandRawBorderColor !== band.bg &&
          bandRawBorderColor !== firstRowUniformBg
          ? bandRawBorderColor
          : undefined
      const bandBorderStyle = bandHasExplicitBorder
        ? borderSpecToStyle(bandBorder!, tok, tok.layout.recordBorderPx)
        : bandBorderColor
          ? `border-bottom:${tok.layout.recordBorderPx}px solid ${bandBorderColor};`
          : ""
      const bandCellHtml = `<td align="${bandAlign}"${bandBgAttr}
  style="${bandStyle} padding-top:${ry}px;padding-right:${rx}px;padding-bottom:${ry}px;padding-left:${rx}px;${bandBorderStyle}">
${indentHtml(wrapBlockStyle(band.innerHtml, bandStyle, tok), 2)}
</td>`
      return `<tr>
  <td style="padding-top:${p}px;padding-bottom:${p}px;${padXCss}">
    <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" style="width:100%;border-collapse:collapse;">
      <tr>
${indentHtml(bandCellHtml, 8)}
      </tr>
      <tr>
        <td align="center">
          <table align="center" border="0" cellspacing="0" cellpadding="0" width="100%" style="width:100%;max-width:100%;padding:0;margin:0;" role="presentation">
${indentHtml(rowsHtml, 12)}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`
    },
  }
}
export const templates = buildTemplates(defaultTokens)
