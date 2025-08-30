import * as React from "react";
import { preloadAssets, STARTUP_ASSETS } from "@core/assets";

type Status = "idle" | "preloading" | "ok" | "error";

export function usePreload() {
  const [status, setStatus] = React.useState<Status>("idle");
  const [progress, setProgress] = React.useState<number>(0);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [health, setHealth] = React.useState<null | { ok?: boolean }>(null);

  const start = React.useCallback(async () => {
    setStatus("preloading");
    setProgress(0);
    setErrors([]);

    // 1) Kick asset preloads
    const p = preloadAssets(STARTUP_ASSETS, (done, total) => {
      setProgress(Math.round((done / total) * 100));
    });

    // 2) Ping backend in parallel (best-effort)
    const ping = (async () => {
      try {
        const res = await (window as any)?.arcano?.ping?.();
        setHealth(res || {});
      } catch {
        setHealth({});
      }
    })();

    const [assets] = await Promise.allSettled([p, ping]).then((r) => [r[0]] as const);

    if (assets.status === "fulfilled") {
      if (assets.value.ok) {
        setStatus("ok");
      } else {
        setErrors(assets.value.errors);
        setStatus("error");
      }
    } else {
      setErrors([String(assets.reason)]);
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    // auto-start on first mount
    if (status === "idle") start();
  }, [status, start]);

  return { status, progress, errors, health, start };
}
