export type AnimEvent =
  | { type: "AI:summary:start" }
  | { type: "AI:summary:done" }
  | { type: "AI:library:scan:start" }
  | { type: "AI:library:scan:done" }
  | { type: "FW:burst" };

type Listener = (e: AnimEvent) => void;

class AnimationBus {
  private ls = new Set<Listener>();
  emit(e: AnimEvent){ this.ls.forEach(fn => { try{ fn(e) }catch{} }) }
  on(fn: Listener){ this.ls.add(fn); return ()=> this.ls.delete(fn) }
}
export const AnimBus = new AnimationBus();
