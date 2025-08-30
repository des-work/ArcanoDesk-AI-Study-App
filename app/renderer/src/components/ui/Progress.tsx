import * as React from "react";
import * as Slider from "@radix-ui/react-slider";
import { cn } from "../../lib/cn";

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-4 w-full rounded-md border border-edge/70 bg-[#0d0b16] overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[#7b5cff] to-[#9b7bff] transition-[width] duration-200" style={{ width: `${Math.max(0,Math.min(100,value))}%` }} />
    </div>
  );
}

/** Optional: stylized slider (can be removed if not needed now) */
export function ProgressSlider(props: React.ComponentProps<typeof Slider.Root>) {
  return (
    <Slider.Root className="relative flex items-center select-none touch-none w-full h-6" {...props}>
      <Slider.Track className="bg-[#0d0b16] relative grow rounded-md h-2 border border-edge/70">
        <Slider.Range className="absolute h-full bg-gradient-to-r from-[#7b5cff] to-[#9b7bff] rounded-md" />
      </Slider.Track>
      <Slider.Thumb className="block w-4 h-4 bg-white rounded-full border border-edge/70" aria-label="Value" />
    </Slider.Root>
  );
}
