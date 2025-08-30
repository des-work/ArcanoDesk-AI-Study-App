export type ThemeVariant = {
  name: string;
  tokens: Partial<import("./tokens").TokenScale>;
  knobs?: { nightGlow?: boolean; goldTrim?: boolean; };
};

export const ArcanumDay: ThemeVariant = {
  name: "ArcanumDay",
  tokens: {
    bg: "#0c0a16",
    panel: "#15102a",
    text: "#efeaff",
    accent: "#7e61ff",
    line: "#30264e"
  },
  knobs: { nightGlow: false, goldTrim: true }
};

export const ArcanumNight: ThemeVariant = {
  name: "ArcanumNight",
  tokens: {
    bg: "#090513",
    panel: "#120d22",
    text: "#f3eaff",
    accent: "#9a6bff",
    line: "#2c2148"
  },
  knobs: { nightGlow: true, goldTrim: true }
};

export const VARIANTS: Record<string, ThemeVariant> = {
  ArcanumDay,
  ArcanumNight
};
