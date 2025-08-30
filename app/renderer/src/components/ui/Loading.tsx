import React, { useEffect } from "react";
import { useFlow } from "../../providers/FlowProvider";

export default function Loading() {
  const { setFlow } = useFlow();

  useEffect(() => {
    const timer = setTimeout(() => setFlow("gate"), 3000); // move to gate after 3s
    return () => clearTimeout(timer);
  }, [setFlow]);

  return <div style={{ color: "white" }}>🔄 Loading assets...</div>;
}
