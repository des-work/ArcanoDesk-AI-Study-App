export type AssetManifest = {
  fonts: string[];      // absolute or public/ paths
  images: string[];     // hero svgs, logos, etc.
};

export const manifest: AssetManifest = {
  fonts: [
    // "/public/fonts/YourFont.woff2"
  ],
  images: [
    // "/public/hero/castle.svg",
    // "/public/hero/stars.webp"
  ]
};
