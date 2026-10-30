import { defineConfig, loadEnv } from "vite";
import { devQuizPlugin } from "./server/devQuizPlugin.js";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    devQuizPlugin(loadEnv(mode, process.cwd(), "")),
  ],
}));
