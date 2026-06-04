import {
  AUTO_DISPLAY_TOKEN,
  DEFAULT_RESULT_DISPLAY_SETTINGS,
  DEFAULT_RESULT_DISPLAY_TEMPLATE,
  ResultDisplaySettings
} from '../types/resultDisplay';

export type DisplayContext = Record<string, unknown>;

const MAX_AUTO_DEPTH = 8;
const MAX_FLATTEN_PATHS = 48;

export interface ParsedTextBlock {
  index: number;
  raw: string;
  parsed: unknown;
}

/**
 * 从任意 MCP 结果构建通用展示上下文
 */
export function buildDisplayContext(
  ret: unknown,
  autoParseJsonText = true
): DisplayContext {
  const root =
    ret !== null && typeof ret === 'object'
      ? (ret as Record<string, unknown>)
      : { value: ret };

  const texts = extractTextBlocks(root);
  const parsedBlocks: ParsedTextBlock[] = texts.map((raw, index) => ({
    index,
    raw,
    parsed: autoParseJsonText ? tryParseJsonValue(raw) ?? raw : raw
  }));

  const parsedList = parsedBlocks.map((b) => b.parsed);
  const parsedFirst =
    parsedList.find((p) => p !== null && typeof p === 'object' && !Array.isArray(p)) ??
    parsedList[0] ??
    {};

  const ctx: DisplayContext = {
    ret: root,
    ...root,
    texts,
    'texts[*]': texts,
    parsed: parsedFirst,
    parsedList,
    'parsed[*]': parsedList,
    parsedBlocks,
    'content.text': texts[0] ?? '',
    text: texts[0] ?? '',
  };

  parsedBlocks.forEach((block, i) => {
    ctx[`parsed.${i}`] = block.parsed;
    ctx[`texts.${i}`] = block.raw;
    if (block.parsed !== null && typeof block.parsed === 'object' && !Array.isArray(block.parsed)) {
      Object.entries(block.parsed as Record<string, unknown>).forEach(([k, v]) => {
        ctx[`parsed.${i}.${k}`] = v;
        if (i === 0) ctx[`parsed.${k}`] = v;
      });
    }
  });

  ctx._pathHints = collectPathHints(ctx);
  return ctx;
}

function extractTextBlocks(ret: Record<string, unknown>): string[] {
  const content = ret.content;
  if (!Array.isArray(content)) return [];

  const blocks: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.type === 'text' && typeof row.text === 'string') {
      blocks.push(row.text);
    }
  }
  return blocks;
}

function tryParseJsonValue(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function deepParseValue(value: unknown, autoParse: boolean, depth: number): unknown {
  if (!autoParse || depth > MAX_AUTO_DEPTH) return value;
  if (typeof value === 'string') {
    const parsed = tryParseJsonValue(value);
    return parsed !== null ? deepParseValue(parsed, autoParse, depth + 1) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepParseValue(item, autoParse, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepParseValue(v, autoParse, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * 通配路径展开：content[*].text、content[?type=text].text、parsed[*]
 */
export function expandWildcardPath(ctx: DisplayContext, path: string): string {
  const trimmed = path.trim();

  const filterMatch = trimmed.match(/^(.+)\[\?([^\]=]+)=([^\]]+)\](.*)$/);
  if (filterMatch) {
    const [, base, field, expected, suffix] = filterMatch;
    const arr = resolveDisplayPath(ctx, base);
    if (!Array.isArray(arr)) return '';
    const parts: string[] = [];
    arr.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const row = item as Record<string, unknown>;
      if (String(row[field] ?? '') !== expected) return;
      const subPath = suffix ? `${base}.${index}${suffix}` : `${base}.${index}`;
      const v = resolveDisplayPath(ctx, subPath.startsWith('.') ? subPath.slice(1) : subPath);
      const formatted = formatDisplayValue(v);
      if (formatted) parts.push(formatted);
    });
    return parts.join('\n\n---\n\n');
  }

  const starMatch = trimmed.match(/^(.+)\[\*\](.*)$/);
  if (starMatch) {
    const [, base, suffix] = starMatch;
    const arr = resolveDisplayPath(ctx, base);
    if (Array.isArray(arr)) {
      const parts: string[] = [];
      arr.forEach((_, index) => {
        const subPath = suffix
          ? `${base}.${index}${suffix.startsWith('.') ? suffix : `.${suffix}`}`
          : `${base}.${index}`;
        const normalized = subPath.replace(/^\./, '');
        const v = resolveDisplayPath(ctx, normalized);
        const formatted = formatDisplayValue(v);
        if (formatted) parts.push(formatted);
      });
      return parts.join('\n\n---\n\n');
    }
    if (base === 'parsed' && suffix === '' && Array.isArray(ctx.parsedList)) {
      return (ctx.parsedList as unknown[])
        .map((item, i) => `[parsed.${i}]\n${formatDisplayValue(item)}`)
        .join('\n\n---\n\n');
    }
    if (base === 'texts') {
      const texts = ctx.texts;
      if (Array.isArray(texts)) {
        return texts
          .map((t, i) => (suffix ? formatDisplayValue(resolveDisplayPath(ctx, `texts.${i}${suffix}`)) : String(t)))
          .filter(Boolean)
          .join('\n\n---\n\n');
      }
    }
  }

  return formatDisplayValue(resolveDisplayPath(ctx, trimmed));
}

/**
 * 按路径从上下文取值（属性访问，无 eval）
 */
export function resolveDisplayPath(ctx: DisplayContext, path: string): unknown {
  const trimmed = path.trim();
  if (!trimmed || trimmed === 'auto') return undefined;
  if (trimmed === 'ret') return ctx.ret;
  if (trimmed.includes('[*]') || trimmed.includes('[?')) {
    return expandWildcardPath(ctx, trimmed);
  }

  const normalized = trimmed
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/^\.+/, '');

  const parts = normalized.split('.').filter(Boolean);
  let current: unknown = ctx;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (current == null || typeof current !== 'object') return undefined;

    const obj = current as Record<string, unknown>;

    if (part === 'text' && Array.isArray(obj.content)) {
      current = extractTextBlocks(obj)[0];
      continue;
    }

    if (part === 'content' && i + 1 < parts.length && parts[i + 1] === 'text') {
      current = extractTextBlocks(obj)[0];
      i += 1;
      continue;
    }

    current = obj[part];
  }

  return current;
}

export function formatDisplayValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 通用自动美化：适配 MCP content[] 任意 type 及顶层字段
 */
export function formatAutoPretty(ret: unknown, autoParseJsonText = true): string {
  if (ret === null || ret === undefined) return '';
  if (typeof ret !== 'object') return formatDisplayValue(ret);

  const obj = deepParseValue(ret, autoParseJsonText, 0) as Record<string, unknown>;
  const sections: string[] = [];

  if (Array.isArray(obj.content)) {
    obj.content.forEach((item, index) => {
      sections.push(formatContentItem(item, index, autoParseJsonText));
    });
  }

  const metaKeys = Object.keys(obj).filter((k) => k !== 'content');
  if (metaKeys.length > 0) {
    const metaLines = metaKeys.map((k) => `${k}: ${formatDisplayValue(obj[k])}`);
    sections.push(`---\n${metaLines.join('\n')}`);
  }

  const body = sections.filter(Boolean).join('\n\n');
  return body || formatDisplayValue(obj);
}

function formatContentItem(item: unknown, index: number, autoParseJsonText: boolean): string {
  if (item === null || item === undefined) return '';
  if (typeof item !== 'object') return `[${index}] ${formatDisplayValue(item)}`;

  const block = item as Record<string, unknown>;
  const type = String(block.type ?? 'unknown');
  const header = `[content.${index}] type=${type}`;

  switch (type) {
    case 'text': {
      const text = typeof block.text === 'string' ? block.text : formatDisplayValue(block.text);
      const body = formatTextBlockAuto(text, autoParseJsonText);
      return `${header}\n${body}`;
    }
    case 'image':
      return `${header}\nmimeType: ${block.mimeType ?? '-'}\n(data omitted)`;
    case 'resource':
      return `${header}\n${formatDisplayValue(block)}`;
    default:
      return `${header}\n${formatDisplayValue(block)}`;
  }
}

function formatTextBlockAuto(text: string, autoParseJsonText: boolean): string {
  if (!autoParseJsonText) return text;

  const parsed = tryParseJsonValue(text);
  if (parsed === null) return text;

  if (Array.isArray(parsed)) {
    return parsed.map((row, i) => `[${i}] ${formatDisplayValue(row)}`).join('\n');
  }

  if (typeof parsed === 'object') {
    return Object.entries(parsed as Record<string, unknown>)
      .map(([key, value]) => {
        const formatted =
          typeof value === 'string' && !value.includes('\n')
            ? value
            : formatDisplayValue(value);
        return `${key}: ${formatted}`;
      })
      .join('\n\n');
  }

  return formatDisplayValue(parsed);
}

/**
 * 应用展示模板
 */
export function applyResultTemplate(
  template: string,
  ctx: DisplayContext,
  autoParseJsonText = true
): string {
  const tpl = template.trim();
  const autoParse = Boolean(ctx._autoParse ?? autoParseJsonText);
  if (!tpl || tpl === AUTO_DISPLAY_TOKEN) {
    return formatAutoPretty(ctx.ret, autoParse);
  }

  let output = tpl.replace(/print\s*\(\s*([^)]+)\s*\)/gi, (_, expr: string) => {
    const value = resolveTemplateExpr(ctx, expr.trim());
    const formatted = typeof value === 'string' ? value : formatDisplayValue(value);
    return formatted ? `${formatted}\n` : '';
  });

  output = output.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, expr: string) => {
    const value = resolveTemplateExpr(ctx, expr.trim());
    return typeof value === 'string' ? value : formatDisplayValue(value);
  });

  return output.replace(/\n{3,}/g, '\n\n').trimEnd();
}

function resolveTemplateExpr(ctx: DisplayContext, expr: string): unknown {
  if (expr === 'auto') {
    return formatAutoPretty(ctx.ret, Boolean(ctx._autoParse ?? true));
  }
  if (expr === 'texts[*]' || expr === 'texts') {
    return expandWildcardPath(ctx, expr.includes('[*]') ? expr : 'texts[*]');
  }
  if (expr.includes('[*]') || expr.includes('[?')) {
    return expandWildcardPath(ctx, expr);
  }
  return resolveDisplayPath(ctx, expr);
}

export function formatPrettyResult(
  ret: unknown,
  settings: Partial<ResultDisplaySettings> = {}
): string {
  const merged = { ...DEFAULT_RESULT_DISPLAY_SETTINGS, ...settings };
  const ctx = buildDisplayContext(ret, merged.autoParseJsonText);
  ctx._autoParse = merged.autoParseJsonText;

  const template = merged.template.trim();
  if (!template || template === AUTO_DISPLAY_TOKEN) {
    return formatAutoPretty(ret, merged.autoParseJsonText);
  }

  const pretty = applyResultTemplate(template, ctx, merged.autoParseJsonText);
  if (pretty) return pretty;

  return formatAutoPretty(ret, merged.autoParseJsonText);
}

export function formatRawResult(ret: unknown): string {
  if (typeof ret === 'string') return ret;
  try {
    return JSON.stringify(ret, null, 2);
  } catch {
    return String(ret);
  }
}

function collectPathHints(ctx: DisplayContext): string[] {
  const hints = new Set<string>([
    AUTO_DISPLAY_TOKEN,
    '{{content[*].text}}',
    '{{content[?type=text].text}}',
    '{{texts[*]}}',
    '{{parsed[*]}}',
    '{{content.0.text}}',
    '{{ret}}',
  ]);

  const content = (ctx.ret as Record<string, unknown>)?.content;
  if (Array.isArray(content)) {
    content.forEach((_, i) => {
      hints.add(`{{content.${i}.text}}`);
    });
  }

  const blocks = ctx.parsedBlocks as ParsedTextBlock[] | undefined;
  if (blocks) {
    blocks.forEach((block) => {
      if (block.parsed !== null && typeof block.parsed === 'object' && !Array.isArray(block.parsed)) {
        Object.keys(block.parsed as object).forEach((k) => {
          hints.add(`{{parsed.${block.index}.${k}}}`);
          if (block.index === 0) hints.add(`{{parsed.${k}}}`);
        });
      }
    });
  }

  return Array.from(hints).slice(0, MAX_FLATTEN_PATHS);
}

export function getDisplayPathHints(ret: unknown, autoParseJsonText = true): string[] {
  const ctx = buildDisplayContext(ret, autoParseJsonText);
  return (ctx._pathHints as string[]) ?? [];
}

export function normalizeResultDisplaySettings(
  input?: Partial<ResultDisplaySettings> | null
): ResultDisplaySettings {
  if (!input) return { ...DEFAULT_RESULT_DISPLAY_SETTINGS };
  return {
    ...DEFAULT_RESULT_DISPLAY_SETTINGS,
    ...input,
    template: input.template?.trim() || DEFAULT_RESULT_DISPLAY_TEMPLATE,
  };
}
