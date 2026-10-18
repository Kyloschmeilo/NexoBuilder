/**
 * Lazily loaded shiki highlighter. Tokens are coloured with the `--yaml-*` design tokens (and `--text`), so the code
 * follows the active colour theme and light/dark mode without highlighting it again.
 */
import * as React from 'react';
import { createHighlighterCore, type GrammarState, type HighlighterCore, type ThemeRegistration } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

// Add the languages you need. Each one loads the first time it is used.
const languages = {
  bash: () => import('shiki/langs/shellscript.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
};

const aliases: Record<string, keyof typeof languages> = {
  js: 'javascript',
  md: 'markdown',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  shellscript: 'bash',
  ts: 'typescript',
  yml: 'yaml',
  zsh: 'bash',
};

const TOKEN_THEME_NAME = 'design-tokens';

// Maps TextMate scopes onto the design tokens; the CSS variables resolve per theme at render time.
const TOKEN_THEME: ThemeRegistration = {
  name: TOKEN_THEME_NAME,
  type: 'dark',
  colors: { 'editor.foreground': 'var(--text)', 'editor.background': 'transparent' },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: 'var(--yaml-comment)', fontStyle: 'italic' } },
    {
      scope: ['entity.name.tag', 'support.type.property-name', 'meta.object-literal.key', 'variable.other.property'],
      settings: { foreground: 'var(--yaml-key)' },
    },
    { scope: ['string', 'punctuation.definition.string'], settings: { foreground: 'var(--yaml-string)' } },
    { scope: ['constant.numeric'], settings: { foreground: 'var(--yaml-number)' } },
    { scope: ['constant.language'], settings: { foreground: 'var(--yaml-bool)' } },
    {
      scope: ['entity.name.type.anchor', 'variable.other.alias', 'punctuation.definition.anchor', 'punctuation.definition.alias'],
      settings: { foreground: 'var(--text-muted)' },
    },
  ],
};

let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [TOKEN_THEME],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });

  return highlighter;
}

// Inline style of one token: its colour and, for comments, italics (shiki's italic font-style flag).
function tokenStyle(token: { color?: string; fontStyle?: number }): React.CSSProperties {
  return { color: token.color, fontStyle: token.fontStyle !== undefined && token.fontStyle & 1 ? 'italic' : undefined };
}

function getLanguage(language: string) {
  const name = language.toLowerCase();

  if (name === 'ansi') {
    return name;
  }

  if (name in languages) {
    return name as keyof typeof languages;
  }

  return aliases[name] ?? null;
}

// Loads a language and returns a highlighter for it, or null for a language
// that is not listed.
export async function loadHighlighter(language: string) {
  const lang = getLanguage(language);

  if (!lang) {
    return null;
  }

  const shiki = await getHighlighter();

  if (lang !== 'ansi' && !shiki.getLoadedLanguages().includes(lang)) {
    await shiki.loadLanguage(languages[lang]);
  }

  return {
    // Returns one React node per line, and the grammar state after the last
    // line. Pass that state back to continue where the code left off.
    highlight(code: string, state?: GrammarState) {
      const tokenize = (text: string) =>
        shiki.codeToTokens(text, {
          lang,
          theme: TOKEN_THEME_NAME,
          grammarState: state,
        }).tokens;

      // ANSI has no grammar state, so each line is tokenized on its own and
      // gets the same colors whether it arrives in one piece or streams.
      const tokens = lang === 'ansi' ? code.split('\n').flatMap((line) => tokenize(line)) : tokenize(code);

      return {
        lines: tokens.map((line) =>
          line.map((token, index) => (
            <span key={index} style={tokenStyle(token)}>
              {token.content}
            </span>
          )),
        ),
        state: shiki.getLastGrammarState(tokens),
      };
    },
  };
}

// Returns one React node per line, or null for a language that is not listed.
export async function highlightCode(code: string, language: string) {
  const highlighter = await loadHighlighter(language);

  return highlighter ? highlighter.highlight(code).lines : null;
}
