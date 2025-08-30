import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/cn";

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.List>) =>
  <TabsPrimitive.List className={cn("flex gap-2", className)} {...p}/>;
export const TabsTrigger = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Trigger>) =>
  <TabsPrimitive.Trigger className={cn("px-3 py-2 rounded-md border border-edge/70 text-[var(--ink)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[#0c0a14] font-bold", className)} {...p}/>;
export const TabsContent = TabsPrimitive.Content;
