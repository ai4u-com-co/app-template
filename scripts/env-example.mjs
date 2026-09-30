#!/usr/bin/env node
/**
 * Genera `.env.example` desde el contrato de env de @ai4u/config
 * (`renderEnvExample`), para que el archivo nunca se desincronice de los nombres
 * canónicos, alias y descripciones.
 *
 *   npm run env:example          → reescribe .env.example
 *   npm run env:check            → falla (exit 1) si .env.example está desactualizado (CI)
 *
 * Si la app empieza a leer una variable nueva, agrégala a ENV_EXAMPLE_NAMES y
 * corre `npm run env:example`. Las variables propias de la app (fuera del
 * contrato) también van acá: salen marcadas como "propia de la app".
 */
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { renderEnvExample } from "@ai4u/config/env"

export const ENV_EXAMPLE_PATH = fileURLToPath(new URL("../.env.example", import.meta.url))

/** Variables que lee la plantilla, en el orden en que aparecen en .env.example. */
export const ENV_EXAMPLE_NAMES = [
  // platform — iguales para todas las apps (Shared Env Vars del team ai4u)
  "SAP_BACKEND_URL",
  "PLATFORM_INGEST_URL",
  "INGEST_SECRET",
  "NEXT_PUBLIC_CHANGELOG_URL",
  "CHANGELOG_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "MISSION_CONTROL_URL",
  // service — identidad de ESTA app
  "MISSION_CONTROL_SECRET",
  "SERVICE_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "SAP_BACKEND_API_KEY",
]

const PREAMBLE = [
  "# ─────────────────────────────────────────────────────────────────────────────",
  "# NO EDITAR A MANO: se regenera con `npm run env:example` (scripts/env-example.mjs).",
  "# En local: cp .env.example .env.local — nunca commitear valores reales.",
  "#",
  "# Obligatoria: MISSION_CONTROL_SECRET (sin ella la app no arranca en Production y",
  "# el guard de proxy.ts responde 503). Las demás dependen de lo que use la app.",
  "#",
  "# Llaves del gateway SAP por tenant (no listadas: dependen de qué tenants usan la app):",
  "#   {TENANT}_SAP_API_KEY, p.ej. TAMAPRINT_SAP_API_KEY, FLEXOIMPRESOS_SAP_API_KEY.",
  "#   Se leen SOLO con getGatewayApiKey() de lib/env.ts; el tenant sale de la sesión.",
  "# El clientId/appId del changelog NO van por env: salen de .changelogrc.json.",
  "# ─────────────────────────────────────────────────────────────────────────────",
  "",
].join("\n")

export function buildEnvExample() {
  return PREAMBLE + renderEnvExample(ENV_EXAMPLE_NAMES)
}

function main(argv) {
  const expected = buildEnvExample()
  if (argv.includes("--check")) {
    let current = ""
    try {
      current = readFileSync(ENV_EXAMPLE_PATH, "utf8")
    } catch {
      // no existe: cuenta como desincronizado
    }
    if (current !== expected) {
      console.error(".env.example está desactualizado respecto del contrato. Corre `npm run env:example` y commitea.")
      process.exit(1)
    }
    console.log(".env.example al día.")
    return
  }
  writeFileSync(ENV_EXAMPLE_PATH, expected)
  console.log(`.env.example regenerado (${ENV_EXAMPLE_NAMES.length} variables).`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2))
}
