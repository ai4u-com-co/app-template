import { withApiHandler } from "@ai4u/platform/http"
import { requireModule } from "@ai4u/platform/auth"
import { readEnv } from "@/lib/env"
import { MODULE_ID } from "@/lib/service"
import { sapGatewayFetch } from "@/lib/sap-gateway"

export const dynamic = "force-dynamic"

/**
 * Endpoint de ejemplo — patrón completo de una ruta del ecosistema:
 *  1. withApiHandler: requestId, logging estructurado, errores JSON uniformes.
 *  2. requireModule: sesión SSO de MC (cookie mc_session) + acceso al módulo.
 *  3. Gateway SAP con el tenant DE LA SESIÓN (nunca uno fijo) y su llave
 *     {TENANT}_SAP_API_KEY, resuelta en lib/sap-gateway.ts.
 *
 * Borra o reemplaza este archivo por la lógica real del módulo.
 */
export const GET = withApiHandler(async (_req, ctx) => {
  const identity = requireModule(ctx.identity, MODULE_ID)

  const gateway = await sapGatewayFetch(identity.tenantId, "health")
  ctx.log.info(
    { gatewayStatus: gateway.status, keySource: gateway.keySource, keyEnvName: gateway.keyEnvName },
    "gateway SAP consultado",
  )

  return {
    tenant: identity.tenantId,
    gatewayTenant: gateway.gatewayTenant,
    gatewayStatus: gateway.status,
    data: gateway.data,
  }
}, {
  label: "GET example",
  // El secreto de sesión pasa por lib/env (canónico + alias), no por process.env suelto.
  sessionAuth: { secret: readEnv("MISSION_CONTROL_SECRET") },
})
