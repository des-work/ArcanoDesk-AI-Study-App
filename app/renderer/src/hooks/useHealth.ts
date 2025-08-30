import * as React from "react";
import { api } from "@core/api";

export function useHealth(){
  const [data,setData] = React.useState<any>(null);
  const [error,setError] = React.useState<string>("");
  const [loading,setLoading] = React.useState<boolean>(true);
  React.useEffect(()=>{ (async()=>{
    try{ setLoading(true); const h = await api.health(); setData(h); }
    catch(e:any){ setError(String(e?.message||e)); }
    finally{ setLoading(false); }
  })(); },[]);
  return { data, error, loading };
}
