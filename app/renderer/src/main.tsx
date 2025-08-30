import "./theme/applyEarly";

import React from "react";
import { createRoot } from "react-dom/client";
import "./ui/global.css";
import "./ui/theme.css";

import { UIProvider } from "./providers/UIProvider";
import { FlowProvider } from "./providers/FlowProvider";

import Root from "./ui/Root";
import { SummaryOverlay } from "./components/ui/SummaryOverlay";
import ErrorBoundary from "./components/ErrorBoundary";
import BootHud from "./components/dev/BootHud";

import { initBoot } from "./core/boot";

initBoot();

const root = createRoot(document.getElementById("root")!);
root.render(
  <ErrorBoundary>
    <UIProvider>
      <FlowProvider>
        <>
          <Root />
          <SummaryOverlay />
          {import.meta.env.DEV && <BootHud />}
        </>
      </FlowProvider>
    </UIProvider>
  </ErrorBoundary>
);
