import React from "react";
import { useFlow } from "../../providers/FlowProvider";

export default function EnterGate() {
  const { setStep } = useFlow();

  return (
    <div style={{ textAlign: "center", color: "white", paddingTop: "20%" }}>
      <h1>🏰 Welcome to ArcanoDesk</h1>
      <button
        style={{ marginTop: "20px", padding: "12px 24px", fontSize: "18px" }}
        onClick={() => setStep("desk")}
      >
        ENTER
      </button>
    </div>
  );
}
