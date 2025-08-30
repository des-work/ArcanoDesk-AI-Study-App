import { tokens as base } from "./tokens";
import type { ThemeVariant } from "./variants";

export type RuntimeTheme = {
  name: string;
  tokens: typeof base;
  knobs?: { nightGlow?: boolean; goldTrim?: boolean; };
};

export function makeTheme(variant?: ThemeVariant): RuntimeTheme {
  const merged = { ...base, ...(variant?.tokens||{}) };
  return { name: variant?.name || "Custom", tokens: merged, knobs: variant?.knobs };
}

export function applyTheme(rt: RuntimeTheme){
  const r = document.documentElement;
  const t = rt.tokens;
  r.style.setProperty("--bg", t.bg);
  r.style.setProperty("--panel", t.panel);
  r.style.setProperty("--text", t.text);
  r.style.setProperty("--accent", t.accent);
  r.style.setProperty("--accentText", t.accentText);
  r.style.setProperty("--line", t.line);
  r.style.setProperty("--success", t.success);
  r.style.setProperty("--warn", t.warn);
  r.setAttribute("data-theme", rt.name);
}
