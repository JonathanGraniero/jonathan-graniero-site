import type { HighlighterCore } from 'shiki/core';

/**
 * Fine-grained Shiki setup: only the grammars this blog uses, and the pure-JS
 * regex engine instead of Oniguruma WASM. Loaded on demand the first time a
 * code block renders, so it never weighs down the initial bundle.
 */
const LANGS = {
  ts: () => import('shiki/langs/typescript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  js: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  dockerfile: () => import('shiki/langs/dockerfile.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
} as const;

const ALIASES: Record<string, keyof typeof LANGS> = {
  typescript: 'ts',
  javascript: 'js',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  py: 'python',
  rs: 'rust',
  golang: 'go',
  docker: 'dockerfile',
  md: 'markdown',
};

export type SupportedLang = keyof typeof LANGS;

export function resolveLang(lang: string | undefined): SupportedLang | null {
  if (!lang) return null;
  const key = lang.toLowerCase();
  if (key in LANGS) return key as SupportedLang;
  return ALIASES[key] ?? null;
}

let highlighter: Promise<HighlighterCore> | null = null;
const loaded = new Set<SupportedLang>();

async function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, light, dark] =
      await Promise.all([
        import('shiki/core'),
        import('shiki/engine/javascript'),
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ]);
    return createHighlighterCore({
      themes: [light.default, dark.default],
      langs: [],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    });
  })();
  return highlighter;
}

/** Returns highlighted HTML, or null when the language isn't supported. */
export async function highlight(code: string, lang: string | undefined): Promise<string | null> {
  const resolved = resolveLang(lang);
  if (!resolved) return null;
  const hl = await getHighlighter();
  if (!loaded.has(resolved)) {
    await hl.loadLanguage((await LANGS[resolved]()).default);
    loaded.add(resolved);
  }
  return hl.codeToHtml(code, {
    lang: resolved,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: 'light',
  });
}
