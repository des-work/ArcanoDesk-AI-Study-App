import React, { Suspense } from "react";
import { useFlow } from "@providers/FlowProvider";

const LoadingGate = React.lazy(() => import("@components/ui/LoadingGate"));
const EnterGate  = React.lazy(() => import("@components/ui/EnterGate"));
const Desk       = React.lazy(() => import("@components/ui/Desk"));

export default function Root() {
  const { step } = useFlow();

  return (
    <Suspense fallback={<div style={{ color: "white" }}>⏳ Loading…</div>}>
      {step === "loading" && <LoadingGate />}
      {step === "gate"     && <EnterGate />}
      {step === "desk"     && <Desk />}
    </Suspense>
  );
}
