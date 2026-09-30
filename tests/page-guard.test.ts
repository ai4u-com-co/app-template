import { describe, expect, it } from "vitest"
import { createSession } from "@ai4u/mc-sso"
import { decideAccess, isApiPath, isPublicPath, renderNoSessionPage } from "@/lib/page-guard"
import { OTHER_SECRET, TEST_SECRET } from "./test-secrets"

describe("isPublicPath", () => {
  it("deja pasar el receptor SSO, health y assets de Next", () => {
    for (const p of ["/api/mc-auth", "/api/health", "/_next/static/chunk.js", "/_next/image", "/favicon.ico"]) {
      expect(isPublicPath(p), p).toBe(true)
    }
  })

  it("no confunde prefijos parecidos (no hay bypass por nombre)", () => {
    for (const p of ["/", "/api/example", "/api/mc-auth-x", "/api/healthz", "/_nextx", "/dashboard"]) {
      expect(isPublicPath(p), p).toBe(false)
    }
  })

  it("isApiPath distingue API de páginas", () => {
    expect(isApiPath("/api/example")).toBe(true)
    expect(isApiPath("/apis")).toBe(false)
    expect(isApiPath("/")).toBe(false)
  })
})

describe("decideAccess", () => {
  const valid = createSession("tamaprint", TEST_SECRET, 60_000, { allowedModules: ["app-template"] })

  it("sesión válida → ok con el payload (tenant de la sesión)", () => {
    const d = decideAccess({ pathname: "/", sessionToken: valid, secret: TEST_SECRET })
    expect(d.kind).toBe("ok")
    if (d.kind === "ok") expect(d.session.tenantId).toBe("tamaprint")
  })

  it("sin cookie, firmada con otro secreto o vencida → unauthenticated", () => {
    const vencida = createSession("tamaprint", TEST_SECRET, -1_000)
    const otra = createSession("tamaprint", OTHER_SECRET, 60_000)
    for (const token of [undefined, "", "basura", otra, vencida]) {
      expect(decideAccess({ pathname: "/", sessionToken: token, secret: TEST_SECRET }).kind).toBe("unauthenticated")
    }
  })

  it("fail-closed: sin secreto nunca deja pasar una ruta protegida", () => {
    expect(decideAccess({ pathname: "/", sessionToken: valid, secret: undefined }).kind).toBe("misconfigured")
    expect(decideAccess({ pathname: "/api/example", sessionToken: valid, secret: "" }).kind).toBe("misconfigured")
  })

  it("las rutas públicas no dependen del secreto ni de la sesión", () => {
    expect(decideAccess({ pathname: "/api/mc-auth", sessionToken: undefined, secret: undefined }).kind).toBe("public")
  })
})

describe("renderNoSessionPage", () => {
  it("indica entrar desde Mission Control y enlaza la URL configurada", () => {
    const html = renderNoSessionPage({ missionControlUrl: "https://mc.example.com" })
    expect(html).toContain("Mission Control")
    expect(html).toContain('href="https://mc.example.com/"')
    expect(html).toContain('name="viewport"')
  })

  it("ignora URLs no http(s) y escapa el nombre de la app", () => {
    const html = renderNoSessionPage({ missionControlUrl: "javascript:alert(1)", appName: "<b>x</b>" })
    expect(html).not.toContain("javascript:")
    expect(html).not.toContain("<b>x</b>")
    expect(html).not.toContain("href=")
  })
})
