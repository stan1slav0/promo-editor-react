// Advanced HTML Converter — full pipeline.
// See ADVANCED_HTML_CONVERTER.md §10 for phase descriptions.

import { cleanEmptyHtmlTags, replaceTripleBrWithSingle } from "../utils/htmlUtils";
import { buildTemplates, templates as defaultTemplates } from "./config/templates";
import type { TokensOverride } from "./config/tokens";
import { mergeTokens,tokens } from "./config/tokens";
import { classify } from "./detect/classify";
import { fromDom, resetListGroupCounter } from "./ir/fromDom";
import { normalize } from "./normalize";
import { normalizeSymbols,preprocess } from "./preprocess";
import { renderAll } from "./render/toEmailHtml";
import { sanitize } from "./sanitize";

export interface AdvancedConversionResult {
  html: string;
  /** Non-fatal issues: content that was dropped or flattened during conversion */
  warnings: string[];
}

export interface AdvancedConversionOptions {
  /**
   * Run the final HTML through the DOMPurify allowlist (sanitize.ts). Off by default:
   * output is built from a controlled IR so it's already safe, and DOMPurify reserializes
   * the markup (injecting <tbody>, normalizing entities). Enable only when the raw input
   * is untrusted and belt-and-suspenders sanitization is worth the reserialization.
   */
  sanitize?: boolean;
}

export function convertAdvancedDetailed(
  rawHtml: string,
  override: TokensOverride = {},
  oneBrSymbol?: string,
  options: AdvancedConversionOptions = {},
): AdvancedConversionResult {
  const hasOverride = Object.keys(override).length > 0;
  const tok  = hasOverride ? mergeTokens(tokens, override) : tokens;
  const tmpl = hasOverride ? buildTemplates(tok)           : defaultTemplates;

  const warnings: string[] = [];
  const warn = (msg: string) => warnings.push(msg);

  const html        = preprocess(rawHtml, oneBrSymbol, warn);
  const bodyEl      = normalize(html);
  // fromDom's listGroupId counter is module-level (recursion would reset a local one) —
  // reset it here, the single entry point into one document's fromDom-recursion tree.
  resetListGroupCounter();
  const structural  = fromDom(bodyEl, tok.color.rootBackground, tok, warn);
  const components  = classify(structural, tok, warn);
  const rows        = renderAll(components, tmpl, tok);

  let result = tmpl.document(rows);
  result = normalizeSymbols(result);
  result = cleanEmptyHtmlTags(result);
  result = replaceTripleBrWithSingle(result);
  if (options.sanitize) result = sanitize(result);
  return { html: result, warnings };
}

export function convertAdvanced(
  rawHtml: string,
  override: TokensOverride = {},
  options: AdvancedConversionOptions = {},
): string {
  return convertAdvancedDetailed(rawHtml, override, undefined, options).html;
}
