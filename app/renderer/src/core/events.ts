type Handler<T=any> = (payload:T)=>void;
const channels = new Map<string, Set<Handler>>();

export const bus = {
  on<T=any>(ch: string, fn: Handler<T>) {
    if(!channels.has(ch)) channels.set(ch,new Set());
    channels.get(ch)!.add(fn as Handler);
    return ()=> channels.get(ch)!.delete(fn as Handler);
  },
  emit<T=any>(ch: string, payload:T){
    const set = channels.get(ch); if(!set) return;
    for(const fn of set) try{ (fn as Handler<T>)(payload) }catch(_e){}
  },
  clear(ch?: string){ ch? channels.delete(ch) : channels.clear(); }
};
