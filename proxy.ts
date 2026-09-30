import { NextResponse, type NextRequest } from "next/server"
import { decideAccess, isApiPath, renderNoSessionPage } from "@/lib/page-guard"
import { readEnv } from "@/lib/env"
import { SESSION_COOKIE } from "@/lib/session"

/**
 * Guard de sesión SSO de Mission Control para toda la app (Next 16: proxy.ts,
 * runtime Node). La lógica está en lib/page-guard.ts; ver ahí las reglas.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const decision = decideAccess({
    pathname,
    sessionToken: req.cookies.get(SESSION_COOKIE)?.value,
    secret: readEnv("MISSION_CONTROL_SECRET"),
  })

  if (decision.kind === "public" || decision.kind === "ok") return NextResponse.next()

  if (decision.kind === "misconfigured") {
    return NextResponse.json(
      { error: "Configuración de servidor incompleta", code: "CONFIG_MISSING" },
      { status: 503 },
    )
  }

  if (isApiPath(pathname)) {
    return NextResponse.json({ error: "No autenticado", code: "UNAUTHORIZED" }, { status: 401 })
  }
  return new NextResponse(renderNoSessionPage({ missionControlUrl: readEnv("MISSION_CONTROL_URL") }), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  })
}

// Todo pasa por el proxy salvo los assets estáticos de Next y archivos de imagen/fuente.
// (Rutas como /api/mc-auth y /api/health se dejan pasar en lib/page-guard.ts, no acá,
// para que la regla sea testeable sin el runtime de Next.)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
}
