import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { buildEnvExample, ENV_EXAMPLE_NAMES, ENV_EXAMPLE_PATH } from "@/scripts/env-example.mjs"

const ROOT = join(__dirname, "..")

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

describe(".env.example", () => {
  it("está sincronizado con el contrato (si falla: npm run env:example)", () => {
    expect(readFileSync(ENV_EXAMPLE_PATH, "utf8")).toBe(buildEnvExample())
  })

  it("lista toda variable que el código lee con readEnv()", () => {
    const files = [...sourceFiles(join(ROOT, "lib")), ...sourceFiles(join(ROOT, "app")), join(ROOT, "proxy.ts")]
    const read = new Set<string>()
    for (const file of files) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (/^\s*(\/\/|\*)/.test(line)) continue // comentarios (lib/env.ts documenta un ejemplo)
        for (const m of line.matchAll(/readEnv\("([A-Z0-9_]+)"/g)) read.add(m[1])
      }
    }
    expect(read.size).toBeGreaterThan(0)
    const missing = [...read].filter((n) => !ENV_EXAMPLE_NAMES.includes(n))
    expect(missing).toEqual([])
  })
})
