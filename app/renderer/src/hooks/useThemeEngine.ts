import * as React from "react";
import { applyTheme, makeTheme } from "@theme/engine";
import { VARIANTS } from "@theme/variants";
import { aiStyleSuggest } from "@agents/styleAgent";

export function useThemeEngine(){
  const [name,setName] = React.useState<string>("ArcanumDay");
  const [busy,setBusy] = React.useState<boolean>(false);

  const setVariant = React.useCallback((key: keyof typeof VARIANTS)=>{
    const rt = makeTheme(VARIANTS[key]);
    applyTheme(rt);
    setName(key);
  },[]);

  const suggest = React.useCallback(async (opts: Parameters<typeof aiStyleSuggest>[0])=>{
    setBusy(true);
    try { return await aiStyleSuggest(opts); }
    finally { setBusy(false); }
  },[]);

  React.useEffect(()=>{ setVariant("ArcanumDay"); },[setVariant]);

  return { current:name, setVariant, suggest, busy };
}
