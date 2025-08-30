import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core":       path.resolve(__dirname, "src/core"),
      "@hooks":      path.resolve(__dirname, "src/hooks"),
      "@providers":  path.resolve(__dirname, "src/providers"),
      "@components": path.resolve(__dirname, "src/components"),
      "@store":      path.resolve(__dirname, "src/store"),
      "@types":      path.resolve(__dirname, "src/types"),
      "@lib":        path.resolve(__dirname, "src/lib"),
    },
  },
  server: { port: 5173, strictPort: true },
  build:  { outDir: "dist" }
});
