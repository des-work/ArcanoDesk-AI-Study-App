import * as React from "react";
import { ipc } from "../../core/ipc";

export function StatusPip(){
  const [ok,setOk] = React.useState<boolean>(false);
  const [msg,setMsg] = React.useState<string>("checking…");
  React.useEffect(()=>{
    let stop=false;
    const tick = async ()=>{
      const h = await ipc.ping();
      if(stop) return;
      setOk(!!h?.ok);
      setMsg(h?.ok ? "backend ok" : "backend offline");
    };
    tick();
    const id = setInterval(tick, 5000);
    return ()=>{ stop=true; clearInterval(id); }
  },[]);
  const color = ok ? "#34d399" : "#ef4444";
  return (
    <div style={{position:"fixed", left:10, bottom:10, zIndex:60, display:"flex", gap:8, alignItems:"center"}}>
      <div title={msg} style={{
        width:10,height:10,borderRadius:9999,background:color,
        boxShadow: `0 0 10px ${color}aa`
      }}/>
      <div className="small" style={{opacity:.8}}>{msg}</div>
    </div>
  );
}
