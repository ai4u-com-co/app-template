import { readEnv, type EnvSource } from "@/lib/env"

/**
 * Identidad de ESTA app — el ÚNICO lugar donde se escribe su id.
 *
 * Al crear un repo desde la plantilla, cambia "app-template" por el id real del
 * módulo. Ese mismo valor debe coincidir con:
 *   - `sso.serviceId` (y normalmente `id`) del módulo en Mission Control
 *     (`mission-control/lib/tenants/modules.ts`) — si no coincide, el handoff SSO
 *     de /api/mc-auth rechaza el token (verifyMcToken compara el serviceId).
 *   - `appId` de `.changelogrc.json` (historial en changelog-service).
 */
export const SERVICE_ID = "app-template"

/**
 * Id del módulo que se exige en `allowed_modules` del usuario (requireModule).
 * Por convención es el mismo SERVICE_ID; sepáralo solo si MC lo registra distinto.
 */
export const MODULE_ID: string = SERVICE_ID

/**
 * Id efectivo del servicio en runtime: env `SERVICE_ID` (alias `PLATFORM_SERVICE`)
 * si está definida, si no la constante SERVICE_ID. Lo usan los logs
 * (lib/observability.ts) y el header `x-consumer` hacia el gateway SAP
 * (lib/sap-gateway.ts). El SSO y requireModule usan SIEMPRE la constante: el
 * override es solo de atribución, nunca de permisos.
 */
export function resolveServiceId(env: EnvSource = process.env): string {
  return readEnv("SERVICE_ID", env) ?? SERVICE_ID
}
