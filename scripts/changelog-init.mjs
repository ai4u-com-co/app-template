#!/usr/bin/env node
/**
 * Instala el hook pre-commit del changelog (@ai4u-labs/changelog-client) usando
 * la config YA commiteada en .changelogrc.json — no hay que repetir client/app a mano.
 *
 *   CHANGELOG_API_KEY=... npm run changelog:init
 *   (o con CHANGELOG_API_KEY en .env.local)
 *
 * Qué hace `changelog-hook init` por debajo: reescribe .changelogrc.json con los
 * mismos valores, agrega CHANGELOG_API_KEY a .env.local si no estaba (ignorado
 * por git) y crea .git/hooks/pre-commit. Cada clon tiene que correrlo una vez:
 * los hooks de git no se versionan.
 *
 * Antes de instalar verifica que appId === SERVICE_ID de lib/service.ts.
 */
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

function fail(msg) {
  console.error(`[changelog:init] ${msg}`)
  process.exit(1)
}

const rc = JSON.parse(readFileSync(".changelogrc.json", "utf8"))
for (const k of ["serviceUrl", "clientId", "appId"]) {
  if (typeof rc[k] !== "string" || !rc[k].trim()) fail(`.changelogrc.json no tiene "${k}".`)
}

const serviceSrc = readFileSync("lib/service.ts", "utf8")
const serviceId = serviceSrc.match(/export const SERVICE_ID = "([^"]+)"/)?.[1]
if (!serviceId) fail("No encontré SERVICE_ID en lib/service.ts.")
if (rc.appId !== serviceId) {
  fail(`appId de .changelogrc.json ("${rc.appId}") ≠ SERVICE_ID ("${serviceId}"). Alinéalos antes de instalar.`)
}

function keyFromEnvLocal() {
  if (!existsSync(".env.local")) return undefined
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*CHANGELOG_API_KEY\s*=\s*(.*)\s*$/)
    if (m) return m[1].replace(/^["']|["']$/g, "") || undefined
  }
  return undefined
}

const key = process.env.CHANGELOG_API_KEY || keyFromEnvLocal()
if (!key) {
  fail(
    "Falta CHANGELOG_API_KEY (en el entorno o en .env.local). Pídesela a Mariano; nunca la commitees.",
  )
}

// El paquete no exporta el subpath del CLI: se resuelve su entrada (dist/index.js)
// y se toma dist/cli/bin.js al lado (mismo archivo que usa el hook generado).
const entry = createRequire(import.meta.url).resolve("@ai4u-labs/changelog-client")
const bin = join(dirname(entry), "cli", "bin.js")
if (!existsSync(bin)) fail(`No encontré el CLI del changelog en ${bin}. ¿Corriste npm install?`)
execFileSync(
  process.execPath,
  [bin, "init", "--url", rc.serviceUrl, "--client", rc.clientId, "--app", rc.appId, "--key", key],
  { stdio: "inherit" },
)
