#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const type = process.argv[2]

if (!["patch", "minor", "major"].includes(type)) {
  console.error("Usage: node scripts/bump-version.js <patch|minor|major>")
  process.exit(1)
}

const pkgPath = path.join(__dirname, "..", "package.json")
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
const [major, minor, patch] = pkg.version.split(".").map(Number)

let newMajor = major, newMinor = minor, newPatch = patch

if (type === "patch")       { newPatch++ }
else if (type === "minor")  { newMinor++; newPatch = 0 }
else if (type === "major")  { newMajor++; newMinor = 0; newPatch = 0 }

const newVersion = `${newMajor}.${newMinor}.${newPatch}`
console.log(`Bumping version: ${pkg.version} → ${newVersion} (${type})`)

pkg.version = newVersion
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
console.log("✓ Updated package.json")

const manifestPath = path.join(__dirname, "..", "public", "manifest.json")
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
manifest.version = newVersion
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
console.log("✓ Updated public/manifest.json")

try {
  execSync("git add package.json public/manifest.json", { stdio: "pipe" })
  execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: "pipe" })
  execSync(`git tag v${newVersion}`, { stdio: "pipe" })
  console.log(`✓ Created git commit and tag v${newVersion}`)
} catch {
  console.log("⚠ Git commit/tag skipped")
}

console.log(`\nDone! Version is now ${newVersion}`)
