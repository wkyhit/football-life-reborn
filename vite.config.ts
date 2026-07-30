import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import "./src/domain/catalog/classicCatalog";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
