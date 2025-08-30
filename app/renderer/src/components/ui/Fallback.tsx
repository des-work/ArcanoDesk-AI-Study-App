import React from "react";

export default function Fallback() {
  return (
    <div style={{ color: "red", textAlign: "center", padding: "40px" }}>
      ⚠️ Unknown flow state. Something went wrong.
    </div>
  );
}
