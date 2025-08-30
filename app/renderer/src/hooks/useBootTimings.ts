import * as React from "react";
import { getBootTimings } from "@core/boot";

export function useBootTimings(pollMs = 250){
  const [state, setState] = React.useState(getBootTimings());
  React.useEffect(()=>{
    const id = setInterval(()=> setState(getBootTimings()), pollMs);
    return ()=> clearInterval(id);
  }, [pollMs]);
  return state;
}
