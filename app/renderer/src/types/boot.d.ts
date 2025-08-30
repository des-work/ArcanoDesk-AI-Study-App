declare global {
  interface Window {
    __BOOT_TIMINGS__?: {
      marks: Record<string, number>;
      flags: {
        healthOk?: boolean;
        modelWarm?: boolean;
        cacheHit?: boolean;
      };
      errors: string[];
    };
  }
}
export {};
