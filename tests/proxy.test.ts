import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { createSession } from "@ai4u/mc-sso"
import { config, proxy } from "@/proxy"
import { TEST_SECRET } from "./test-secrets"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("matcher de proxy.ts", () => {
  const matches = (path: string) => unstable_doesMiddlewareMatch({ config, url: `https://app.example${path}` })

  it("corre en páginas y API (incluido /api/mc-auth: la excepción la decide lib/page-guard)", () => {
    for (const p of ["/", "/dashboard", "/api/example", "/api/mc-auth", "/reporte.csv"]) {
      expect(matches(p), p).toBe(true)
    }
  })

  it("no corre en assets estáticos", () => {
    for (const p of ["/_next/static/chunks/app.js", "/_next/image", "/favicon.ico", "/logo.svg", "/fonts/a.woff2"]) {
      expect(matches(p), p).toBe(false)
    }
  })
})

function request(path: string, cookie?: string) {
  const headers = new Headers()
  if (cookie) headers.set("cookie", `mc_session=${cookie}`)
  return new NextRequest(`https://app.example${path}`, { headers })
}

describe("proxy()", () => {
  it("sesión válida → deja pasar", () => {
    vi.stubEnv("MISSION_CONTROL_SECRET", TEST_SECRET)
    const res = proxy(request("/", createSession("flexoimpresos", TEST_SECRET, 60_000)))
    expect(res.headers.get("x-middleware-next")).toBe("1")
  })

  it("página sin sesión → 401 HTML amable (no redirect a un login inexistente)", async () => {
    vi.stubEnv("MISSION_CONTROL_SECRET", TEST_SECRET)
    vi.stubEnv("MISSION_CONTROL_URL", "https://mc.example.com")
    const res = proxy(request("/"))
    expect(res.status).toBe(401)
    expect(res.headers.get("location")).toBeNull()
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(await res.text()).toContain("Mission Control")
  })

  it("API sin sesión → 401 JSON", async () => {
    vi.stubEnv("MISSION_CONTROL_SECRET", TEST_SECRET)
    const res = proxy(request("/api/example"))
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("receptor SSO y health quedan públicos", () => {
    vi.stubEnv("MISSION_CONTROL_SECRET", TEST_SECRET)
    expect(proxy(request("/api/mc-auth")).headers.get("x-middleware-next")).toBe("1")
    expect(proxy(request("/api/health")).headers.get("x-middleware-next")).toBe("1")
  })

  it("sin MISSION_CONTROL_SECRET → 503, nunca deja pasar", () => {
    vi.stubEnv("MISSION_CONTROL_SECRET", "")
    const res = proxy(request("/", createSession("tamaprint", TEST_SECRET, 60_000)))
    expect(res.status).toBe(503)
  })
})
