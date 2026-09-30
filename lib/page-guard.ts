/**
 * Guard de sesión para TODA la app (páginas y API), usado por proxy.ts.
 *
 * La lógica vive acá (pura, testeable); proxy.ts solo la orquesta. Reglas:
 *   - Rutas públicas: el receptor del handoff SSO (/api/mc-auth), el health
 *     check y los assets de Next. Todo lo demás exige cookie `mc_session` válida.
 *   - Fail-closed: sin MISSION_CONTROL_SECRET no se puede verificar la sesión,
 *     así que se responde 503 (nunca se deja pasar).
 *   - Sin sesión: 401. Las páginas muestran una pantalla amable que indica entrar
 *     desde Mission Control (esta app no tiene login propio, no se redirige a uno);
 *     las rutas /api/* responden JSON.
 *
 * Solo verifica que la sesión sea válida. El acceso a un módulo concreto
 * (allowed_modules) lo exige cada ruta con `requireModule` de @ai4u/platform.
 */
import { verifySession, type SessionPayload } from "@ai4u/mc-sso"

/** Rutas que nunca exigen sesión (coincidencia exacta o como prefijo de segmento). */
export const PUBLIC_PATHS = ["/api/mc-auth", "/api/health", "/_next", "/favicon.ico", "/robots.txt"] as const

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/")
}

export type GuardDecision =
  | { kind: "public" }
  | { kind: "ok"; session: SessionPayload }
  | { kind: "misconfigured" }
  | { kind: "unauthenticated" }

export function decideAccess(input: {
  pathname: string
  sessionToken: string | undefined
  secret: string | undefined
}): GuardDecision {
  if (isPublicPath(input.pathname)) return { kind: "public" }
  if (!input.secret) return { kind: "misconfigured" }
  const session = verifySession(input.sessionToken ?? "", input.secret)
  return session ? { kind: "ok", session } : { kind: "unauthenticated" }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** Solo URLs http(s) absolutas: nada de `javascript:` ni rutas relativas. */
function safeHttpUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null
  } catch {
    return null
  }
}

/**
 * HTML autocontenido de "entra desde Mission Control". No usa el layout de la app
 * (el proxy responde antes de renderizar) y por eso no trae el design system:
 * usa colores del sistema (`Canvas`/`CanvasText`), sin colores de marca
 * hardcodeados. Fluido a 375px (sin anchos fijos, texto ≥ 14px, botón ≥ 44px).
 */
export function renderNoSessionPage(opts: { missionControlUrl?: string; appName?: string } = {}): string {
  const mcUrl = safeHttpUrl(opts.missionControlUrl)
  const app = escapeHtml(opts.appName ?? "esta aplicación")
  const cta = mcUrl
    ? `<a class="cta" href="${escapeHtml(mcUrl)}">Ir a Mission Control</a>`
    : `<p>Abre Mission Control y entra a ${app} desde su tarjeta.</p>`
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Entra desde Mission Control</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: Canvas; color: CanvasText; }
  main { box-sizing: border-box; width: 100%; max-width: 28rem; padding: 2rem 1.25rem; }
  h1 { font-size: 1.375rem; line-height: 1.3; margin: 0 0 .75rem; }
  p { font-size: 1rem; line-height: 1.5; margin: 0 0 1rem; overflow-wrap: anywhere; }
  .cta { display: inline-flex; align-items: center; min-height: 44px; padding: 0 1.25rem; border-radius: .5rem;
         border: 1px solid currentColor; color: inherit; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
<main>
  <h1>Tu sesión no está activa</h1>
  <p>Para usar ${app} tienes que entrar desde Mission Control. Si ya estabas adentro, la sesión pudo haber vencido: vuelve a abrirla desde allá.</p>
  ${cta}
</main>
</body>
</html>`
}
