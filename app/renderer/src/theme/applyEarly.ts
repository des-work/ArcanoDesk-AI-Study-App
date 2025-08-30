/**
 * Apply last-good theme tokens early, so there is no flash before React mounts.
 * Stored key: "arcano.themeTokens" -> { bg, panel, text, accent, accentText, line, success, warn }
 */
(function applyEarly(){
  try{
    const txt = window.localStorage?.getItem("arcano.themeTokens");
    if(!txt) return;
    const t = JSON.parse(txt);
    const r = document.documentElement;
    const map = ["bg","panel","text","accent","accentText","line","success","warn"];
    map.forEach((k)=>{ if(t[k]) r.style.setProperty("--"+(k==="accentText"?"accentText":k), t[k]); });
  }catch(_e){}
})();
