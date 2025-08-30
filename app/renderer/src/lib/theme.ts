export const flags = {
  graphicsEnabled: false,   // Pixi stage (set true when you add visuals)
  motionEnabled:   true,    // Framer/GSAP transitions
  heavyDecor:      false,   // stars/comets/trees layers
} as const;

export const tokens = {
  radius: { xl: "rounded-xl", lg: "rounded-lg", md: "rounded-md" },
  card:   "bg-[var(--card)] border border-edge/70 shadow-[0_10px_40px_rgba(0,0,0,0.35)]",
  btn:    "bg-accent text-[#0c0a14] font-bold px-4 py-3 rounded-md",
};
