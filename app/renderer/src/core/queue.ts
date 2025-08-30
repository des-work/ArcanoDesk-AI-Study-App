import { nanoid } from "nanoid";
type JobFn<T> = (signal: AbortSignal)=> Promise<T>;

export class JobQueue {
  private q: { id:string; run:JobFn<any> }[] = [];
  private running: AbortController | null = null;
  private onChange?: (state:{busy:boolean; size:number})=>void;

  constructor(onChange?: (s:{busy:boolean; size:number})=>void) {
    this.onChange = onChange;
  }

  enqueue<T>(run: JobFn<T>): Promise<T> {
    return new Promise<T>((resolve,reject)=>{
      const id = nanoid();
      this.q.push({ id, run: async (signal)=> {
        try { const out = await run(signal); resolve(out); }
        catch(e){ reject(e); }
      }});
      this.pump();
    });
  }

  cancelCurrent(){
    if (this.running) { this.running.abort(); }
  }

  private async pump(){
    if (this.running || this.q.length===0) return;
    this.running = new AbortController();
    this.onChange?.({busy:true,size:this.q.length});
    const job = this.q.shift()!;
    try { await job.run(this.running.signal); }
    finally {
      this.running = null;
      this.onChange?.({busy:this.q.length>0,size:this.q.length});
      if (this.q.length>0) this.pump();
    }
  }

  size(){ return this.q.length + (this.running?1:0); }
}
