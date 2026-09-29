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
