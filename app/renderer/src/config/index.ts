import raw from "./arcano.theme.json";
export type Theme = typeof raw;
export const theme: Theme = raw as Theme;
