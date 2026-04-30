import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { readdirSync, rmSync, statSync } from "fs"
import { join } from "path"

/** Returns a human-readable build period like "early 2026" or "late 2025" */
function getBuildPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const period = month <= 4 ? "early" : month <= 8 ? "mid" : "late"
  return `${period} ${year}`
}

/** Recursively delete macOS .DS_Store files from the output directory */
function cleanDsStore(): Plugin {
  return {
    name: "clean-ds-store",
    closeBundle() {
      const deleteIn = (dir: string) => {
        try {
          for (const entry of readdirSync(dir)) {
            const full = join(dir, entry)
            if (entry === ".DS_Store") {
              rmSync(full, { force: true })
            } else if (statSync(full).isDirectory()) {
              deleteIn(full)
            }
          }
        } catch {}
      }
      deleteIn("extension")
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cleanDsStore()],
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
