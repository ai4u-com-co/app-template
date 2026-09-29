/**
 * Cliente mínimo del gateway SAP (`sap-b1-backend`), el ÚNICO borde con SAP B1.
 * Esta app nunca habla con Service Layer directo.
 *
 * Multitenant: el tenant SIEMPRE llega como argumento y sale de la sesión del
 * usuario (ctx.identity.tenantId), nunca de una constante ni de una env var.
 *
 * Contrato del gateway (verificado en sap-b1-backend@master, lib/auth.ts):
 *   - Rutas: `${SAP_BACKEND_URL}/api/v1/{tenant}/…` con tenant del gateway en
 *     minúsculas ("tamaprint", "flexoimpresos").
 *   - Auth: header `X-API-Key` con la llave del tenant; el gateway rechaza la
 *     llave si no corresponde al tenant de la URL.
 */
import { InfrastructureError, ExternalServiceError } from "@ai4u/platform/errors"
import { getGatewayApiKey, normalizeTenant, readEnv, type EnvSource, type GatewayKeySource } from "@/lib/env"

export interface GatewayDeps {
  env?: EnvSource
  fetch?: typeof fetch
  /** ms antes de abortar (default 30 s, dentro del maxDuration típico de Vercel). */
  timeoutMs?: number
}

export interface GatewayResult<T = unknown> {
  status: number
  ok: boolean
  data: T
  /** Tenant tal como lo espera el gateway (p.ej. "flexoimpresos"). */
  gatewayTenant: string
  /** De dónde salió la llave (auditable; nunca el valor). */
  keySource: GatewayKeySource
  keyEnvName: string
}

/** Id de tenant de MC → id del gateway: "flexo" → "flexoimpresos". */
export function toGatewayTenant(tenantId: string): string {
  return normalizeTenant(tenantId).toLowerCase().replace(/_/g, "-")
}

/** Construye la URL `/api/v1/{tenant}/{path}` sin permitir escapar del prefijo. */
export function buildGatewayUrl(baseUrl: string, tenantId: string, path: string): URL {
  const cleanPath = path.replace(/^\/+/, "")
  const pathOnly = cleanPath.split(/[?#]/)[0]
  const isDotSegment = (seg: string) => /^(\.|%2e){1,2}$/i.test(seg)
  if (pathOnly.split("/").some(isDotSegment)) {
    throw new InfrastructureError("Ruta de gateway inválida", { code: "GATEWAY_BAD_PATH", httpStatus: 400 })
  }
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  return new URL(`api/v1/${encodeURIComponent(toGatewayTenant(tenantId))}/${cleanPath}`, base)
}

/**
 * GET/POST al gateway para el tenant de la sesión. Lanza errores tipados de
 * @ai4u/platform que withApiHandler convierte en respuestas JSON uniformes:
 *   - 503 CONFIG_MISSING si falta SAP_BACKEND_URL o la llave del tenant.
 *   - 502 GATEWAY_UNREACHABLE si el gateway no responde / timeout.
 * Un status HTTP no-2xx del gateway NO lanza: se devuelve en `status`/`ok`.
 */
export async function sapGatewayFetch<T = unknown>(
  tenantId: string,
  path: string,
  init: RequestInit = {},
  deps: GatewayDeps = {},
): Promise<GatewayResult<T>> {
  const env = deps.env ?? process.env
  const doFetch = deps.fetch ?? fetch

  const baseUrl = readEnv("SAP_BACKEND_URL", env)
  if (!baseUrl) {
    throw new InfrastructureError("SAP_BACKEND_URL no configurado", { code: "CONFIG_MISSING", httpStatus: 503 })
  }
  const apiKey = getGatewayApiKey(tenantId, env)
  if (!apiKey) {
    throw new InfrastructureError("Falta la llave del gateway para este tenant", {
      code: "CONFIG_MISSING",
      httpStatus: 503,
      // Nombre esperado (no el valor) para que el error sea accionable.
      details: { expected: `${normalizeTenant(tenantId)}_SAP_API_KEY` },
    })
  }

  const url = buildGatewayUrl(baseUrl, tenantId, path)
  const headers = new Headers(init.headers)
  headers.set("X-API-Key", apiKey.key)
  if (!headers.has("accept")) headers.set("accept", "application/json")

  let res: Response
  try {
    res = await doFetch(url.toString(), {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(deps.timeoutMs ?? 30_000),
    })
  } catch (cause) {
    throw new ExternalServiceError("El gateway SAP no respondió", {
      code: "GATEWAY_UNREACHABLE",
      httpStatus: 502,
      cause,
    })
  }

  const text = await res.text()
  let data: unknown = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // respuesta no-JSON: se devuelve como texto
  }

  return {
    status: res.status,
    ok: res.ok,
    data: data as T,
    gatewayTenant: toGatewayTenant(tenantId),
    keySource: apiKey.source,
    keyEnvName: apiKey.envName,
  }
}
