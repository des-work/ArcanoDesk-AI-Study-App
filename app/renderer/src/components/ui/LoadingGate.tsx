import React, { useEffect } from "react";
import { usePreload } from "@hooks/usePreload";
import { useFlow } from "@providers/FlowProvider";

export default function LoadingGate() {
  const { status, progress, errors } = usePreload();
  const { setStep } = useFlow();

  // When preloading finishes OK, proceed to "gate"
  useEffect(() => {
    if (status === "ok") {
      const t = setTimeout(() => setStep("gate"), 400);
      return () => clearTimeout(t);
    }
  }, [status, setStep]);

  const note =
    status === "preloading" ? "Preparing scrolls and sprites…" :
    status === "ok" ? "Ready." :
    "Hmm… a miscast. We can still proceed.";

  return (
    <div style={{ display:"grid", placeItems:"center", minHeight:"100vh", color:"#fff" }}>
      <div className="card" style={{ minWidth: 360, maxWidth: 520, textAlign: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🔮 ArcanoDesk</div>
        <div className="small" style={{ opacity:.9, marginBottom: 12 }}>{note}</div>
        <div style={{ height: 12, borderRadius: 8, background: "var(--line)", overflow: "hidden" }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            transition: "width 200ms ease",
            background: "var(--accent)"
          }} />
        </div>
        <div className="small" style={{ marginTop: 8 }}>{progress}%</div>

        {status === "error" && (
          <div style={{ marginTop: 10, color: "#ffd166", textAlign: "left" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Some items failed to preload:</div>
            <ul style={{ margin: 0, paddingLeft: "18px", maxHeight: 120, overflow: "auto" }}>
              {errors.slice(0,5).map((e,i)=> <li key={i}>{e}</li>)}
            </ul>
            <button className="button" style={{ marginTop: 12 }} onClick={()=> setStep("gate")}>
              Continue anyway
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
