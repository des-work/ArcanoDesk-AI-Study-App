import * as React from "react";

// 2D LQIP starfield (immediate, super cheap)
function StarLQIP(){
  const ref = React.useRef<HTMLCanvasElement|null>(null);
  React.useEffect(()=>{
    const c = ref.current!; const dpr = Math.min(2, window.devicePixelRatio||1);
    const w = c.clientWidth||960, h = c.clientHeight||540; c.width=w*dpr; c.height=h*dpr;
    const g = c.getContext("2d")!; g.scale(dpr,dpr); g.clearRect(0,0,w,h);
    for(let i=0;i<120;i++){ const x=Math.random()*w, y=Math.random()*h, r=Math.random()*1.4+.3, a=.6+Math.random()*.4;
      g.globalAlpha = a; g.fillStyle="#bfd7ff"; g.beginPath(); g.arc(x,y,r,0,Math.PI*2); g.fill();
    }
  },[]);
  return <canvas style={{width:"100%",height:"100%"}} ref={ref}/>;
}

export default function PixiStage({ className }:{className?:string}){
  const [upgraded,setUpgraded] = React.useState(false);
  const holder = React.useRef<HTMLDivElement|null>(null);

  React.useEffect(()=>{
    let cancelled=false;
    const doInit = async ()=>{
      try{
        // idle or tiny delay before heavy import
        const idle = (cb:Function)=> ('requestIdleCallback' in window) ? (window as any).requestIdleCallback(cb) : setTimeout(cb, 60);
        idle(async ()=>{
          if(cancelled) return;
          // dynamically import PIXI + unsafe-eval to satisfy Electron CSP
          const PIXI = await import("pixi.js");
          const { extensions } = PIXI as any;
          const mod = await import("@pixi/unsafe-eval");
          // @ts-ignore
          extensions.add(mod.unsafeEvalSupported ? mod.unsafeEvalSupported() : mod.default);
          const app = new (PIXI as any).Application({ width: 960, height: 540, backgroundAlpha: 0, antialias: true });
          if(!holder.current){ app.destroy(true); return; }
          holder.current.innerHTML = ""; holder.current.appendChild(app.view as HTMLCanvasElement);

          // Starfield
          const starCont = new (PIXI as any).Container();
          app.stage.addChild(starCont);
          const stars:any[] = [];
          for (let i=0;i<200;i++){
            const g = new (PIXI as any).Graphics();
            const x = Math.random()*app.renderer.width;
            const y = Math.random()*app.renderer.height;
            const r = Math.random()*1.6 + 0.4;
            g.beginFill(0xBFD7FF, 0.9).drawCircle(0,0,r).endFill();
            g.x=x; g.y=y; g.alpha = 0.7 + Math.random()*0.3;
            starCont.addChild(g); stars.push(g);
          }
          let t=0; const tick = app.ticker.add((d:number)=>{ t+=d*0.03; for(let i=0;i<stars.length;i++){ stars[i].alpha = 0.6 + 0.4*Math.sin(t*(0.3+(i%7)*0.05)); } });
          setUpgraded(true);
          return ()=>{ tick?.destroy(); app.destroy(true,{children:true,texture:true,baseTexture:true}); };
        });
      }catch(_e){ /* keep LQIP */ }
    };
    doInit(); return ()=>{ cancelled=true; };
  },[]);

  return <div className={className} style={{width:"100%",height:"100%"}} ref={holder}>{!upgraded && <StarLQIP/>}</div>;
}
