import { readEnv, type EnvSource } from "@/lib/env"
import { SERVICE_ID } from "@/lib/service"

export interface ChangelogConfig {
  serviceUrl: string
  clientId: string
  appId: string
}

/**
 * Config del pill de changelog. Devuelve null (el pill no se renderiza) si falta
 * la URL del servicio o el clientId — nunca inventa un cliente por defecto.
 * El appId cae a SERVICE_ID, que por convención es el mismo de .changelogrc.json.
 */
export function getChangelogConfig(env: EnvSource = process.env): ChangelogConfig | null {
  const serviceUrl = readEnv("NEXT_PUBLIC_CHANGELOG_URL", env)
  const clientId = readEnv("NEXT_PUBLIC_CHANGELOG_CLIENT", env)
  if (!serviceUrl || !clientId) return null
  return { serviceUrl, clientId, appId: readEnv("NEXT_PUBLIC_CHANGELOG_APP", env) ?? SERVICE_ID }
}
