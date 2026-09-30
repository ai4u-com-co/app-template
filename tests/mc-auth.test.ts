import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMcToken, verifySession } from "@ai4u/mc-sso"
import { POST } from "@/app/api/mc-auth/route"
import { SERVICE_ID } from "@/lib/service"
import { SESSION_TTL_MS } from "@/lib/session"
import { OTHER_SECRET, TEST_SECRET } from "./test-secrets"

// Receptor del handoff SSO actual (mc-sso 1.1.0). Cuando se migre a
// createMcAuthHandler (mc-sso 1.2.0), estos casos deben seguir pasando.

function handoff(token: string) {
  return new Request("https://app.example/api/mc-auth", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
  })
}

beforeEach(() => {
  vi.stubEnv("MISSION_CONTROL_SECRET", TEST_SECRET)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("POST /api/mc-auth", () => {
  it("token válido → 303 a / con cookie mc_session de 8 h y los permisos del token", async () => {
    const token = createMcToken("flexoimpresos", SERVICE_ID, "Ana", TEST_SECRET, {
      userId: "u-1",
      roles: ["admin"],
      allowedModules: [SERVICE_ID],
    })
    const res = await POST(handoff(token))

    expect(res.status).toBe(303)
    expect(res.headers.get("location")).toBe("https://app.example/")

    const setCookie = res.headers.get("set-cookie") ?? ""
    expect(setCookie).toMatch(/^mc_session=/)
    expect(setCookie).toContain(`Max-Age=${8 * 60 * 60}`)
    expect(SESSION_TTL_MS).toBe(8 * 60 * 60 * 1000)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/SameSite=lax/i)
    expect(setCookie).toContain("Path=/")

    const value = decodeURIComponent(setCookie.split(";")[0].slice("mc_session=".length))
    const session = verifySession(value, TEST_SECRET)
    expect(session).toMatchObject({
      tenantId: "flexoimpresos",
      userId: "u-1",
      roles: ["admin"],
      allowedModules: [SERVICE_ID],
      displayName: "Ana",
    })
    // La sesión firmada dura exactamente SESSION_TTL_MS (8 h).
    expect(session!.exp - session!.iat).toBe(SESSION_TTL_MS)
  })

  it("token firmado con otro secreto → 401 sin cookie", async () => {
    const res = await POST(handoff(createMcToken("tamaprint", SERVICE_ID, "Ana", OTHER_SECRET)))
    expect(res.status).toBe(401)
    expect(res.headers.get("set-cookie")).toBeNull()
  })

  it("token para otro servicio → 401", async () => {
    const res = await POST(handoff(createMcToken("tamaprint", "otro-modulo", "Ana", TEST_SECRET)))
    expect(res.status).toBe(401)
  })

  it("token vacío o basura → 401", async () => {
    expect((await POST(handoff(""))).status).toBe(401)
    expect((await POST(handoff("no.es-un-token"))).status).toBe(401)
  })
})
