import { NextResponse } from "next/server"
import { verifyMcToken, createSession } from "@ai4u/mc-sso"
import { withApiHandler } from "@ai4u/platform/http"
import { readEnv } from "@/lib/env"
import { SERVICE_ID } from "@/lib/service"
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/session"

/**
 * Receptor del handoff SSO de Mission Control (patrón de ai4u-kpis).
 *
 * MC (`/api/handoff`) hace un POST auto-enviado con el mc-token en el BODY del
 * formulario (nunca en la URL). Acá se verifica contra SERVICE_ID y se canjea por
 * la cookie `mc_session`, que es la que lee `readIdentity` de @ai4u/platform en
 * cada ruta (tenant + permisos embebidos, sin tocar la BD).
 *
 * El tenant sale del token firmado por MC — esta app no tiene tenant propio.
 * La sesión dura 8 h (SESSION_TTL_MS en lib/session.ts, FLX-091).
 *
 * TODO(mc-sso 1.2.0): cuando se publique, reemplazar este handler completo por
 * `createMcAuthHandler` de @ai4u/mc-sso (firma según su README) y la cookie por
 * `MC_SESSION_COOKIE`, para no mantener una copia más del receptor. Conservar el
 * TTL de 8 h y los casos de tests/mc-auth.test.ts. v1.1.0 no trae ese helper.
 */

export const POST = withApiHandler(async (req) => {
  const form = await req.formData()
  const token = String(form.get("token") ?? "")
  const secret = readEnv("MISSION_CONTROL_SECRET")
  if (!secret) {
    return NextResponse.json({ error: "Configuración de servidor incompleta" }, { status: 500 })
  }

  const data = verifyMcToken(token, SERVICE_ID, secret)
  if (!data) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 })
  }

  const sessionToken = createSession(data.tenantId, secret, SESSION_TTL_MS, {
    userId: data.userId,
    roles: data.roles,
    allowedModules: data.allowedModules,
    displayName: data.displayName,
  })

  // 303 para que el navegador siga el redirect como GET (no re-POST a "/").
  const res = NextResponse.redirect(new URL("/", req.url), 303)
  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  })
  return res
}, { label: "POST mc-auth" })
