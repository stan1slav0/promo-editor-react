import {
  cleanEmptyHtmlTags,
  replaceTripleBrWithSingle,
} from "../utils/htmlUtils";
import {
  buildTemplates,
  templates as defaultTemplates,
} from "./config/templates";
import type { TokensOverride } from "./config/tokens";
import { mergeTokens, tokens } from "./config/tokens";
import { normalize, sanitize } from "./core";
import { classify } from "./detect/classify";
import { fromDom, resetListGroupCounter } from "./ir/fromDom";
import { normalizeSymbols, preprocess } from "./preprocess";
import { renderAll } from "./render/toEmailHtml";
export interface AdvancedConversionResult {
  html: string;
  warnings: string[];
}
export interface AdvancedConversionOptions {
  sanitize?: boolean;
}
export function convertAdvancedDetailed(
  rawHtml: string,
  override: TokensOverride = {},
  oneBrSymbol?: string,
  options: AdvancedConversionOptions = {},
): AdvancedConversionResult {
  const hasOverride = Object.keys(override).length > 0;
  const tok = hasOverride ? mergeTokens(tokens, override) : tokens;
  const tmpl = hasOverride ? buildTemplates(tok) : defaultTemplates;
  const warnings: string[] = [];
  const warn = (msg: string) => warnings.push(msg);
  const html = preprocess(rawHtml, oneBrSymbol, warn);
  const bodyEl = normalize(html);
  resetListGroupCounter();
  const structural = fromDom(bodyEl, tok.color.rootBackground, tok, warn);
  const components = classify(structural, tok, warn);
  const rows = renderAll(components, tmpl, tok);
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
