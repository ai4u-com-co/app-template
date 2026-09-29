/**
 * lib/env.ts — punto ÚNICO de lectura de variables de entorno de esta app.
 *
 * Regla: ningún otro archivo lee `process.env.X` directo (salvo NODE_ENV /
 * NEXT_RUNTIME, que son del framework). Todo pasa por `readEnv` / `requireEnv` /
 * `loadEnv`, que siguen el contrato de nombres del ecosistema (fase 1, 29-sep-2026):
 *
 *   1. Se busca el nombre CANÓNICO.
 *   2. Si no está, se prueban sus ALIAS legados en orden; si uno resuelve, se
 *      avisa UNA vez por alias en el log (solo nombres, NUNCA valores).
 *   3. Strings vacíos cuentan como "no seteado".
 *
 * TODO(fase1): reemplazar por loadEnv/readEnv de @ai4u/config v0.2.0 cuando esté
 * publicado (misma API: readEnv, requireEnv, loadEnv, normalizeTenant,
 * getGatewayApiKey, ENV_CONTRACT). Hasta entonces vive acá, sin pin a una versión
 * que no existe.
 *
 * Nota Next.js: las `NEXT_PUBLIC_*` solo se inlinean en el bundle del navegador
 * cuando se escriben literales (`process.env.NEXT_PUBLIC_X`). Por eso esta app
 * las lee en el SERVIDOR con readEnv y se las pasa como props a los componentes
 * cliente (ver app/layout.tsx → components/ChangelogPill.tsx).
 */

export type EnvSource = Record<string, string | undefined>

/** Clases del contrato: dónde vive la variable y quién la define. */
export type EnvClass = "platform" | "service" | "tenant" | "provider"

export interface EnvSpec {
  class: EnvClass
  /** Nombres legados aceptados con aviso, en orden de prioridad. */
  aliases: readonly string[]
  secret: boolean
  /**
   * true = será Shared Environment Variable del team en Vercel (Fase 2): se
   * vincula al proyecto, no se carga a mano en cada uno.
   */
  shared: boolean
  description: string
}

/** Subconjunto del contrato que usa esta plantilla (platform + service). */
export const ENV_CONTRACT = {
  // ── platform (iguales en todas las apps → Shared Env Vars del team) ──────────
  SAP_BACKEND_URL: {
    class: "platform",
    aliases: ["BACKEND_URL", "NEXT_PUBLIC_BACKEND_URL", "SAP_B1_BACKEND_URL", "KPIS_APP_URL"],
    secret: false,
    shared: true,
    description: "URL base del gateway sap-b1-backend (único borde con SAP B1).",
  },
  PLATFORM_INGEST_URL: {
    class: "platform",
    aliases: [],
    secret: false,
    shared: true,
    description: "Endpoint de ingest de logs de @ai4u/platform (panel admin).",
  },
  INGEST_SECRET: {
    class: "platform",
    aliases: [],
    secret: true,
    shared: true,
    description: "Secreto del ingest de logs (header x-ingest-secret).",
  },
  NEXT_PUBLIC_CHANGELOG_URL: {
    class: "platform",
    aliases: ["CHANGELOG_URL", "NEXT_PUBLIC_CHANGELOG_SERVICE_URL"],
    secret: false,
    shared: true,
    description: "URL del changelog-service (lo usa el pill).",
  },
  CHANGELOG_API_KEY: {
    class: "platform",
    aliases: [],
    secret: true,
    shared: true,
    description: "Key de escritura del changelog-service (hook pre-commit / CI).",
  },
  NEXT_PUBLIC_SUPABASE_URL: {
    class: "platform",
    aliases: ["SUPABASE_URL"],
    secret: false,
    shared: true,
    description: "Supabase de Mission Control.",
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    class: "platform",
    aliases: ["SUPABASE_ANON_KEY"],
    secret: false,
    shared: true,
    description: "Anon key de Supabase de MC (pública por diseño, protegida por RLS).",
  },
  MISSION_CONTROL_URL: {
    class: "platform",
    aliases: ["NEXT_PUBLIC_MC_URL"],
    secret: false,
    shared: true,
    description: "URL de Mission Control (para volver al shell).",
  },
  // ── service (identidad de ESTA app → proyecto Vercel de la app) ─────────────
  MISSION_CONTROL_SECRET: {
    class: "service",
    aliases: ["MC_INTERNAL_SECRET", "SAP_BACKEND_SECRET", "BACKEND_SERVICE_SECRET"],
    secret: true,
    shared: false,
    description: "Firma/verifica el handoff SSO y la cookie mc_session. Transitorio: Fase 3 → OIDC.",
  },
  SAP_BACKEND_API_KEY: {
    class: "service",
    aliases: ["SAP_B1_BACKEND_API_KEY"],
    secret: true,
    shared: false,
    description: "Llave de esta app hacia el gateway SOLO si la app es de un único tenant (fallback final).",
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    class: "service",
    aliases: ["SUPABASE_SERVICE_KEY"],
    secret: true,
    shared: false,
    description: "Solo si la app escribe en Supabase.",
  },
  CRON_SECRET: {
    class: "service",
    aliases: [],
    secret: true,
    shared: false,
    description: "Lo manda Vercel Cron; por proyecto.",
  },
  NEXT_PUBLIC_CHANGELOG_CLIENT: {
    class: "service",
    aliases: ["NEXT_PUBLIC_CLIENT_ID", "NEXT_PUBLIC_CHANGELOG_CLIENT_ID"],
    secret: false,
    shared: false,
    description: "clientId del changelog-service (dueño de la app).",
  },
  NEXT_PUBLIC_CHANGELOG_APP: {
    class: "service",
    aliases: ["NEXT_PUBLIC_APP_ID", "NEXT_PUBLIC_CHANGELOG_APP_ID"],
    secret: false,
    shared: false,
    description: "appId en el changelog-service (= appId de .changelogrc.json).",
  },
  SERVICE_ID: {
    class: "service",
    aliases: ["PLATFORM_SERVICE"],
    secret: false,
    shared: false,
    description: "Override opcional del nombre del servicio en logs (default: SERVICE_ID de lib/service.ts).",
  },
} as const satisfies Record<string, EnvSpec>

export type CanonicalName = keyof typeof ENV_CONTRACT

type Warn = (message: string) => void

const warnedAliases = new Set<string>()
let warn: Warn = (message) => console.warn(message)

/** Solo para tests: reinicia el "avisar una vez" y permite capturar avisos. */
export function __resetEnvWarnings(customWarn?: Warn): void {
  warnedAliases.clear()
  warn = customWarn ?? ((message) => console.warn(message))
}

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : value
}

function warnAliasOnce(alias: string, canonical: string): void {
  const key = `${alias}->${canonical}`
  if (warnedAliases.has(key)) return
  warnedAliases.add(key)
  // Solo nombres: jamás el valor.
  warn(`[env] usando alias legado ${alias}; renombrar a ${canonical} (contrato de env Ai4U, fase 1)`)
}

/**
 * Resuelve una variable probando `names` en orden. El primero es el canónico;
 * los demás son alias (avisan una vez). Devuelve también qué nombre resolvió.
 */
export function readFirst(
  names: readonly string[],
  env: EnvSource = process.env,
): { value: string; envName: string } | undefined {
  const [canonical, ...aliases] = names
  const direct = nonEmpty(env[canonical])
  if (direct !== undefined) return { value: direct, envName: canonical }
  for (const alias of aliases) {
    const value = nonEmpty(env[alias])
    if (value !== undefined) {
      warnAliasOnce(alias, canonical)
      return { value, envName: alias }
    }
  }
  return undefined
}

/** Canónico → alias (con aviso) → undefined. */
export function readEnv(name: CanonicalName, env: EnvSource = process.env): string | undefined {
  return readFirst([name, ...ENV_CONTRACT[name].aliases], env)?.value
}

/** Igual que readEnv pero lanza con un mensaje claro (sin valores) si falta. */
export function requireEnv(name: CanonicalName, env: EnvSource = process.env): string {
  const value = readEnv(name, env)
  if (value === undefined) {
    const aliases = ENV_CONTRACT[name].aliases
    const hint = aliases.length ? ` (alias aceptados: ${aliases.join(", ")})` : ""
    throw new Error(`[env] falta la variable ${name}${hint}`)
  }
  return value
}

export interface LoadEnvOptions<R extends CanonicalName, O extends CanonicalName> {
  require?: readonly R[]
  optional?: readonly O[]
  /**
   * Si true, faltantes obligatorias lanzan; si false, solo avisan.
   * Default: true solo en producción de Vercel (VERCEL_ENV=production).
   */
  strict?: boolean
}

export type LoadedEnv<R extends CanonicalName, O extends CanonicalName> =
  { [K in R]: string } & { [K in O]: string | undefined }

/**
 * Valida todo junto al arrancar (se llama desde instrumentation.ts). En
 * producción lanza con la LISTA COMPLETA de faltantes en vez de fallar de a una
 * en runtime; fuera de producción solo avisa.
 */
export function loadEnv<R extends CanonicalName = never, O extends CanonicalName = never>(
  opts: LoadEnvOptions<R, O>,
  env: EnvSource = process.env,
): LoadedEnv<R, O> {
  const strict = opts.strict ?? env.VERCEL_ENV === "production"
  const out: Record<string, string | undefined> = {}
  const missing: string[] = []
  for (const name of opts.require ?? []) {
    const value = readEnv(name, env)
    if (value === undefined) missing.push(name)
    out[name] = value
  }
  for (const name of opts.optional ?? []) out[name] = readEnv(name, env)
  if (missing.length > 0) {
    const message = `[env] faltan variables obligatorias: ${missing.join(", ")}`
    if (strict) throw new Error(message)
    warn(message)
  }
  return out as LoadedEnv<R, O>
}

// ── Tenant ─────────────────────────────────────────────────────────────────────

/**
 * Alias de id de tenant → prefijo canónico (id del gateway en mayúsculas).
 * Mission Control usa "flexo"; el gateway y las env vars usan FLEXOIMPRESOS.
 */
const TENANT_ID_ALIASES: Record<string, string> = {
  flexo: "FLEXOIMPRESOS",
  "la-magdalena": "MAGDALENA",
  lamagdalena: "MAGDALENA",
  multyhealth: "MULTIHEALTH",
}

const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/

/**
 * Normaliza un id de tenant (el de la sesión de MC) al prefijo de env var:
 * "flexo" → "FLEXOIMPRESOS", "tamaprint" → "TAMAPRINT". Rechaza ids con
 * caracteres raros (el id termina en nombres de variable y en URLs).
 */
export function normalizeTenant(id: string): string {
  const clean = id.trim().toLowerCase()
  if (!TENANT_ID_PATTERN.test(clean)) {
    throw new Error("[env] id de tenant inválido")
  }
  return TENANT_ID_ALIASES[clean] ?? clean.toUpperCase().replace(/-/g, "_")
}

export type GatewayKeySource = "tenant" | "service"

export interface GatewayApiKey {
  key: string
  /** "tenant" = llave del tenant; "service" = fallback SAP_BACKEND_API_KEY (app de un solo tenant). */
  source: GatewayKeySource
  /** Nombre de la variable que resolvió (para logs; nunca el valor). */
  envName: string
}

/**
 * Llave hacia el gateway SAP para un tenant, según el contrato:
 *   {TENANT}_SAP_API_KEY (canónico)
 *   → {TENANT}_GATEWAY_API_KEY, SAP_API_KEY_{TENANT}, {TENANT}_API_KEY (alias, con aviso)
 *   → SAP_BACKEND_API_KEY (fallback final, app de un solo tenant).
 * Nunca se lee `process.env[...]` suelto por tenant fuera de acá.
 */
export function getGatewayApiKey(tenant?: string, env: EnvSource = process.env): GatewayApiKey | null {
  if (tenant) {
    const p = normalizeTenant(tenant)
    const hit = readFirst(
      [`${p}_SAP_API_KEY`, `${p}_GATEWAY_API_KEY`, `SAP_API_KEY_${p}`, `${p}_API_KEY`],
      env,
    )
    if (hit) return { key: hit.value, source: "tenant", envName: hit.envName }
  }
  const fallback = readFirst(["SAP_BACKEND_API_KEY", ...ENV_CONTRACT.SAP_BACKEND_API_KEY.aliases], env)
  return fallback ? { key: fallback.value, source: "service", envName: fallback.envName } : null
}
