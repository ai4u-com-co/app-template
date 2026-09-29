import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getGatewayApiKey, loadEnv, normalizeTenant, readEnv, resetEnvWarnings } from "@/lib/env"

// El contrato en sí (alias, orden de fallback, avisos sin valores) se prueba en
// kernel/packages/config. Acá solo lo propio de la plantilla: que lib/env usa el
// contrato publicado y que loadEnv solo es estricto en Production de Vercel.

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetEnvWarnings()
  warn = vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
})

describe("lib/env usa el contrato de @ai4u/config", () => {
  it("resuelve canónico y alias con aviso sin valores", () => {
    expect(readEnv("SAP_BACKEND_URL", { SAP_BACKEND_URL: "https://canon", BACKEND_URL: "x" })).toBe("https://canon")
    expect(readEnv("MISSION_CONTROL_SECRET", { MC_INTERNAL_SECRET: "valor-secreto-123" })).toBe("valor-secreto-123")
    const avisos = warn.mock.calls.flat().join("\n")
    expect(avisos).toContain("MC_INTERNAL_SECRET")
    expect(avisos).not.toContain("valor-secreto-123")
  })

  it("llave del gateway por tenant, sin mezclar tenants", () => {
    expect(getGatewayApiKey("flexo", { FLEXOIMPRESOS_SAP_API_KEY: "k" })).toMatchObject({
      key: "k",
      source: "tenant",
      envName: "FLEXOIMPRESOS_SAP_API_KEY",
    })
    expect(getGatewayApiKey("tamaprint", { FLEXOIMPRESOS_SAP_API_KEY: "k" })).toBeNull()
    expect(normalizeTenant("flexo")).toBe("FLEXOIMPRESOS")
  })
})

describe("loadEnv de la plantilla", () => {
  const original = process.env.VERCEL_ENV

  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = original
  })

  it("en Production de Vercel lanza con la lista de faltantes, sin valores", () => {
    process.env.VERCEL_ENV = "production"
    expect(() => loadEnv({ require: ["MISSION_CONTROL_SECRET", "SAP_BACKEND_URL"], env: {} })).toThrow(
      /MISSION_CONTROL_SECRET[\s\S]*SAP_BACKEND_URL/,
    )
  })

  it("en Preview (NODE_ENV=production pero VERCEL_ENV=preview) solo avisa", () => {
    process.env.VERCEL_ENV = "preview"
    expect(() => loadEnv({ require: ["MISSION_CONTROL_SECRET"], env: {} })).not.toThrow()
    expect(warn.mock.calls.flat().join("\n")).toContain("MISSION_CONTROL_SECRET")
  })

  it("devuelve obligatorias y opcionales resueltas", () => {
    process.env.VERCEL_ENV = "production"
    const out = loadEnv({
      require: ["MISSION_CONTROL_SECRET"],
      optional: ["INGEST_SECRET"],
      env: { MISSION_CONTROL_SECRET: "s" },
    })
    expect(out.MISSION_CONTROL_SECRET).toBe("s")
    expect(out.INGEST_SECRET).toBeUndefined()
  })
})
