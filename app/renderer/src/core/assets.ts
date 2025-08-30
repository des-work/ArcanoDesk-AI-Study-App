export type PreloadItem =
  | { kind: "image"; url: string }
  | { kind: "json"; url: string }
  | { kind: "audio"; url: string };

export type PreloadResult = { ok: boolean; errors: string[] };

export async function preloadAssets(
  items: PreloadItem[],
  onProgress?: (done: number, total: number) => void
): Promise<PreloadResult> {
  const total = items.length || 1;
  let done = 0;
  const errors: string[] = [];

  const bump = () => { done += 1; onProgress?.(done, total); };

  const tasks = items.map(async (it) => {
    try {
      if (it.kind === "image") {
        await new Promise<void>((res, rej) => {
          const img = new Image();
          img.onload = () => res();
          img.onerror = () => rej(new Error("image load failed: " + it.url));
          img.src = it.url;
        });
      } else if (it.kind === "json") {
        const r = await fetch(it.url, { cache: "force-cache" });
        if (!r.ok) throw new Error("json load failed: " + it.url);
        await r.json();
      } else if (it.kind === "audio") {
        await new Promise<void>((res, rej) => {
          const a = new Audio();
          // Many browsers won’t fully “decode” without user gesture; this is best-effort.
          a.preload = "auto";
          a.oncanplaythrough = () => res();
          a.onerror = () => rej(new Error("audio preload failed: " + it.url));
          a.src = it.url;
          a.load();
        });
      }
    } catch (e: any) {
      errors.push(String(e?.message || e));
    } finally {
      bump();
    }
  });

  await Promise.allSettled(tasks);
  return { ok: errors.length === 0, errors };
}

/** Starter pack — replace with your real asset URLs as you add them */
export const STARTUP_ASSETS: PreloadItem[] = [
  // Images
  { kind: "image", url: "/assets/bg/castle-sky.webp" },
  { kind: "image", url: "/assets/ui/scroll-trim.png" },
  // JSON (example config)
  { kind: "json", url: "/config/arcano.theme.json" },
  // Audio (optional)
  // { kind: "audio", url: "/assets/sfx/chime.mp3" },
];
