export const ipc = {
  async ping(): Promise<{ok:boolean; [k:string]:any}> {
    try {
      const r = await (window as any).arcano?.ping?.();
      return r ?? { ok:false };
    } catch {
      return { ok:false };
    }
  },
  async summarize(args:any){
    try { return await (window as any).arcano?.summarize?.(args); }
    catch(e:any){ return { ok:false, error: String(e?.message||e) }; }
  },
  async listLibrary(args?:any){
    try { return await (window as any).arcano?.listLibrary?.(args); }
    catch { return { ok:false, items:[] }; }
  }
};
