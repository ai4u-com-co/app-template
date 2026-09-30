import changelogrc from "@/.changelogrc.json"
import { readEnv, type EnvSource } from "@/lib/env"

export interface ChangelogConfig {
  serviceUrl: string
  clientId: string
  appId: string
}

interface ChangelogRc {
  serviceUrl?: unknown
  clientId?: unknown
  appId?: unknown
}

function nonEmpty(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

/**
 * Config del pill de changelog.
 *
 * FUENTE ÚNICA de clientId/appId: `.changelogrc.json` — el mismo archivo que lee
 * el hook pre-commit (`changelog-hook run` de @ai4u-labs/changelog-client). Así
 * el pill muestra exactamente el historial en el que escribe el hook. `appId`
 * debe ser igual a SERVICE_ID de lib/service.ts (lo verifica tests/changelog.test.ts).
 *
 * `serviceUrl`: `NEXT_PUBLIC_CHANGELOG_URL` (variable de plataforma, compartida)
 * y, si no está, el `serviceUrl` de `.changelogrc.json`.
 *
 * Devuelve null (el pill no se renderiza) si falta algún dato — nunca inventa un
 * cliente por defecto.
 */
export function getChangelogConfig(
  env: EnvSource = process.env,
  rc: ChangelogRc = changelogrc,
): ChangelogConfig | null {
  const serviceUrl = readEnv("NEXT_PUBLIC_CHANGELOG_URL", env) ?? nonEmpty(rc.serviceUrl)
  const clientId = nonEmpty(rc.clientId)
  const appId = nonEmpty(rc.appId)
  if (!serviceUrl || !clientId || !appId) return null
  return { serviceUrl, clientId, appId }
}
