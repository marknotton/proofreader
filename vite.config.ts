import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/** Returns a human-readable build period like "early 2026" or "late 2025" */
function getBuildPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const period = month <= 4 ? "early" : month <= 8 ? "mid" : "late"
  return `${period} ${year}`
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  define: {
    __BUILD_PERIOD__: JSON.stringify(getBuildPeriod()),
  },
  build: {
    outDir: "extension",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html",
    },
  },
})
