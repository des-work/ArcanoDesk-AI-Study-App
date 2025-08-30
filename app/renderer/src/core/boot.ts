import { manifest } from "./assetManifest";

/** micro util */
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** idempotent init of global timings container */
function ensureTimings(){
  if (!window.__BOOT_TIMINGS__) {
    window.__BOOT_TIMINGS__ = { marks: {}, flags: {}, errors: [] };
  }
  return window.__BOOT_TIMINGS__!;
}

function mark(name: string){
  ensureTimings().marks[name] = now();
}

function recordError(e: any){
  try { ensureTimings().errors.push(String(e?.message ?? e)); } catch {}
}

function preload(url: string, asType?: string){
  try{
    const link = document.createElement("link");
    link.rel = "preload";
    if (asType) link.as = asType as any;
    link.href = url;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }catch(e){ recordError(e); }
}

function prewarmFonts(){
  manifest.fonts.forEach(f => preload(f, "font"));
}

function preloadImages(){
  manifest.images.forEach(src => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
  });
}

/** Abortable fetch with timeout */
async function fetchWithTimeout(input: RequestInfo | URL, ms = 3500, init?: RequestInit){
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try{
    const res = await fetch(input, { ...(init||{}), signal: ctl.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/** Warm up backend health & models concurrently (best-effort) */
async function warmBackend(){
  const timings = ensureTimings();
  const port = (import.meta as any)?.env?.VITE_ARCANO_PY_PORT || "5112";
  const base = `http://127.0.0.1:${port}`;
  try{
    const res = await fetchWithTimeout(`${base}/health`, 3500);
    timings.flags.healthOk = res.ok;
  }catch(e){ recordError(e); }

  // Optional model warm-call (will be ignored if route not present)
  try{
    const res = await fetchWithTimeout(`${base}/warm`, 4000);
    timings.flags.modelWarm = res.ok;
  }catch(_e){}
}

/** public API: call this once before React mounts */
export function initBoot(){
  mark("boot:start");

  // Cache hint: did we have a last-good theme?
  const t = window.localStorage?.getItem("arcano.themeTokens");
  ensureTimings().flags.cacheHit = !!t;

  // Fire-and-forget preloads (low risk in dev)
  prewarmFonts();
  preloadImages();

  // Backend warm-ups (do not block UI)
  warmBackend().catch(recordError);

  mark("boot:queued");
}

/** helper to read timings safely */
export function getBootTimings(){
  return window.__BOOT_TIMINGS__ || { marks:{}, flags:{}, errors:[] };
}

