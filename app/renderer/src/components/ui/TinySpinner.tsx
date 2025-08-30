import * as React from "react";
export function TinySpinner({label}:{label?:string}){
  return (
    <div style={{display:"inline-flex",gap:8,alignItems:"center",fontSize:12,opacity:.9}}>
      <span style={{width:10,height:10,borderRadius:999, border:"2px solid #7b5cff", borderTopColor:"transparent", display:"inline-block", animation:"spin .8s linear infinite"}}/>
      <span>{label??"Loading..."}</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
