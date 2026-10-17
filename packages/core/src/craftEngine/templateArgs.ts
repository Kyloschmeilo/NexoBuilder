/**
 * The `${argument}` placeholders of CraftEngine templates (ArgumentString.preParse of the plugin): `${name}` must be
 * given, `${name:-default}` falls back to its default (read as SNBT), `${name^}` and `${name^^}` capitalize. Braces
 * nest (a default may hold placeholders); `\{` and `\}` are literal braces inside one, `\$` a literal dollar outside.
 *
 * This file imports nothing, so scripts/generate-ce-templates.mjs can run it with Node to list the arguments of the
 * jar's default templates (defaultTemplates.ts).
 */

/** One placeholder in a text: where it is, the argument's name (without `^`) and its default text, if any. */
export interface TemplatePlaceholder {
  start: number;
  end: number;
  name: string;
  /** `^` or `^^` after the name */
  suffix: string;
  /** The text after `:-` (undefined: the argument must be given) */
  defaultText?: string;
}

/** The placeholders of a text, in order (an unclosed `${` is plain text, as for CraftEngine). */
export function templatePlaceholders(text: string): TemplatePlaceholder[] {
  const found: TemplatePlaceholder[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\\' && text[i + 1] === '$') {
      i += 2;
      continue;
    }
    if (text[i] !== '$' || text[i + 1] !== '{') {
      i++;
      continue;
    }
    let depth = 1;
    let content = '';
    let j = i + 2;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === '\\' && (text[j + 1] === '{' || text[j + 1] === '}')) {
        content += text[++j];
      } else if (c === '{') {
        depth++;
        content += c;
      } else if (c === '}') {
        if (--depth === 0) break;
        content += c;
      } else content += c;
    }
    if (depth !== 0) {
      i++;
      continue;
    }
    const separator = content.indexOf(':-');
    const head = separator < 0 ? content : content.slice(0, separator);
    const suffix = head.endsWith('^^') ? '^^' : head.endsWith('^') ? '^' : '';
    const placeholder: TemplatePlaceholder = { start: i, end: j + 1, name: head.slice(0, head.length - suffix.length), suffix };
    if (separator >= 0) placeholder.defaultText = content.slice(separator + 2);
    found.push(placeholder);
    i = j + 1;
  }
  return found;
}

/** The arguments CraftEngine fills itself: the namespace and id of the item, block or furniture the template is in */
export const CE_IMPLICIT_TEMPLATE_ARGUMENTS: readonly string[] = ['__NAMESPACE__', '__ID__'];

/** The arguments a template uses: those it needs and those with a default (each name in one of the lists). */
export interface TemplateArgumentNames {
  required: string[];
  optional: string[];
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** The template ids a `template(s)` value names (a single id or a list). */
export function templateIdsOf(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [value];
  return list.filter((id): id is string => typeof id === 'string');
}

/** The `template` (or `templates`) of a map, undefined when it uses none. */
export function templateKeyOf(value: Record<string, unknown>): unknown {
  return value.template ?? value.templates;
}

/**
 * The arguments a template body uses. A placeholder without default makes its argument required; placeholders inside
 * a default only count as optional (they are only read when the default is). Templates the body uses itself add the
 * arguments they need, unless the body passes them in their `arguments`; `nested` looks those templates up.
 */
export function templateArgumentNames(
  body: unknown,
  nested: (id: string) => TemplateArgumentNames | undefined = () => undefined,
): TemplateArgumentNames {
  const required = new Set<string>();
  const optional = new Set<string>();
  const text = (value: string, inDefault: boolean) => {
    for (const p of templatePlaceholders(value)) {
      if (p.defaultText === undefined && !inDefault) required.add(p.name);
      else optional.add(p.name);
      if (p.defaultText !== undefined) text(p.defaultText, true);
    }
  };
  const walk = (value: unknown, provided: ReadonlySet<string>) => {
    if (typeof value === 'string') {
      const before = new Set(required);
      text(value, false);
      // Arguments the body passes on are given, wherever their placeholders are
      for (const name of required) if (!before.has(name) && provided.has(name)) required.delete(name);
      return;
    }
    if (Array.isArray(value)) {
      for (const entry of value) walk(entry, provided);
      return;
    }
    if (!isObject(value)) return;
    const template = templateKeyOf(value);
    const args = template !== undefined && isObject(value.arguments) ? value.arguments : {};
    const inner = new Set([...provided, ...Object.keys(args)]);
    if (template !== undefined) {
      for (const id of templateIdsOf(template)) {
        // The id may itself use arguments, given by those the use passes
        walk(id, inner);
        const names = id.includes('${') ? undefined : nested(id);
        for (const name of names?.required ?? []) (inner.has(name) ? optional : required).add(name);
        for (const name of names?.optional ?? []) optional.add(name);
      }
      for (const argument of Object.values(args)) walk(argument, provided);
    }
    for (const [key, entry] of Object.entries(value)) {
      if (template !== undefined && (key === 'template' || key === 'templates' || key === 'arguments')) continue;
      walk(key, inner);
      walk(entry, inner);
    }
  };
  walk(body, new Set());
  const implicit = new Set(CE_IMPLICIT_TEMPLATE_ARGUMENTS);
  return {
    required: [...required].filter((name) => !implicit.has(name)).sort(),
    optional: [...optional].filter((name) => !required.has(name) && !implicit.has(name)).sort(),
  };
}
