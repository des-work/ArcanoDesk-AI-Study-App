export interface Actor {
  id: string;
  update(dt: number): void;
  draw?(ctx: CanvasRenderingContext2D): void;
  alive?: boolean;
}
export class GameLoop {
  private raf = 0;
  private last = 0;
  private running = false;
  private actors: Actor[] = [];
  constructor(private ctx?: CanvasRenderingContext2D){}
  add(a: Actor){ this.actors.push(a) }
  start(){
    if(this.running) return;
    this.running = true; this.last = performance.now();
    const tick = (t:number)=>{
      if(!this.running) return;
      const dt = (t - this.last) / 1000; this.last = t;
      this.actors = this.actors.filter(a => a.alive !== false);
      for(const a of this.actors) a.update(dt);
      if(this.ctx){
        const c = this.ctx.canvas; this.ctx.clearRect(0,0,c.width,c.height);
        for(const a of this.actors) a.draw && a.draw(this.ctx);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  stop(){ this.running = false; if(this.raf) cancelAnimationFrame(this.raf) }
}
