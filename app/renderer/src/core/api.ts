const PY_PORT = (import.meta.env?.VITE_ARCANO_PY_PORT as string) || "5112";
const BASE = `http://127.0.0.1:${PY_PORT}`;
function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

export class Api{ warm(){ return this.request("/warm"); } ping(){ return this.request("/health"); }
  async request<T>(path:string, opts:any = {}): Promise<T> {
    const { method = "GET", body, timeoutMs = 20000, retries = 1 } = opts;
    const url = BASE + path;
    for (let n = 0; n <= retries; n++) {
      const ctl = new AbortController();
      const to = setTimeout(()=>ctl.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
          signal: ctl.signal
        });
        clearTimeout(to);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return await res.json();
      } catch (e) {
        if (n === retries) throw e;
        await sleep(300 * (n + 1));
      }
    }
    throw new Error("request failed");
  }

  styleSuggest(payload:any){ return this.request("/style/suggest", { method:"POST", body: payload, timeoutMs: 25000 }); }
  health(){ return this.request("/health"); }
  summarize(args:any){ return this.request("/summarize", { method:"POST", body: args, timeoutMs: 120000 }); }
}
export const api = new Api();

