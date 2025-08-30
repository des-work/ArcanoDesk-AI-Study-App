import { api } from "@core/api";
import { makeTheme, applyTheme } from "@theme/engine";
import { VARIANTS } from "@theme/variants";

export type StyleSuggestInput = {
  baseVariant?: keyof typeof VARIANTS;
  constraints?: string[]; // e.g. ["keep contrast AA", "no neon backgrounds"]
  mood?: string;          // e.g. "storybook gothic modern-retro"
  tweak?: Record<string,string>; // targeted overrides e.g. { accent:"#8a6bff" }
};

export async function aiStyleSuggest(input: StyleSuggestInput){
  const base = input.baseVariant && VARIANTS[input.baseVariant] || VARIANTS["ArcanumDay"];
  const payload = {
    base: { name: base.name, tokens: base.tokens, knobs: base.knobs },
    constraints: input.constraints||[],
    mood: input.mood||"",
    tweak: input.tweak||{}
  };
  const res = await api.styleSuggest(payload);
  if(!res?.ok) throw new Error(res?.error||"style suggest failed");

  const variant = { name: res.name||"AITheme", tokens: res.tokens||{}, knobs: res.knobs||{} };
  const rt = makeTheme(variant as any);
  applyTheme(rt);
  return rt;
}
