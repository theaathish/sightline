import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tanstackStart from "@tanstack/react-start/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    middlewareMode: true,
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
