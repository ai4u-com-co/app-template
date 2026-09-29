import { beforeEach, describe, expect, it } from "vitest"
import {
  __resetEnvWarnings,
  getGatewayApiKey,
  loadEnv,
  normalizeTenant,
  readEnv,
  requireEnv,
} from "@/lib/env"

let warnings: string[] = []

beforeEach(() => {
  warnings = []
  __resetEnvWarnings((m) => warnings.push(m))
})

describe("readEnv", () => {
  it("prefiere el nombre canónico sobre los alias y no avisa", () => {
    const env = { SAP_BACKEND_URL: "https://canon", BACKEND_URL: "https://alias" }
    expect(readEnv("SAP_BACKEND_URL", env)).toBe("https://canon")
    expect(warnings).toEqual([])
  })

  it("cae al alias y avisa una sola vez, sin incluir el valor", () => {
    const env = { MC_INTERNAL_SECRET: "super-secreto-123" }
    expect(readEnv("MISSION_CONTROL_SECRET", env)).toBe("super-secreto-123")
    expect(readEnv("MISSION_CONTROL_SECRET", env)).toBe("super-secreto-123")
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain("MC_INTERNAL_SECRET")
    expect(warnings[0]).toContain("MISSION_CONTROL_SECRET")
    expect(warnings[0]).not.toContain("super-secreto-123")
  })

  it("respeta el orden de los alias", () => {
    const env = { SAP_B1_BACKEND_URL: "https://tercero", NEXT_PUBLIC_BACKEND_URL: "https://segundo" }
    expect(readEnv("SAP_BACKEND_URL", env)).toBe("https://segundo")
  })

  it("trata strings vacíos como no seteados", () => {
    expect(readEnv("INGEST_SECRET", { INGEST_SECRET: "  " })).toBeUndefined()
    expect(readEnv("SAP_BACKEND_URL", { SAP_BACKEND_URL: "", BACKEND_URL: "https://alias" })).toBe("https://alias")
  })
})

describe("requireEnv", () => {
  it("lanza con el nombre y los alias, nunca con valores", () => {
    expect(() => requireEnv("MISSION_CONTROL_SECRET", {})).toThrow(/MISSION_CONTROL_SECRET.*MC_INTERNAL_SECRET/)
  })
})

describe("loadEnv", () => {
  it("devuelve obligatorias y opcionales resueltas", () => {
    const out = loadEnv(
      { require: ["MISSION_CONTROL_SECRET"], optional: ["INGEST_SECRET"] },
      { MISSION_CONTROL_SECRET: "s" },
    )
    expect(out).toEqual({ MISSION_CONTROL_SECRET: "s", INGEST_SECRET: undefined })
  })

  it("en producción de Vercel lanza con la lista completa de faltantes", () => {
    expect(() =>
      loadEnv({ require: ["MISSION_CONTROL_SECRET", "SAP_BACKEND_URL"] }, { VERCEL_ENV: "production" }),
    ).toThrow("MISSION_CONTROL_SECRET, SAP_BACKEND_URL")
  })

  it("fuera de producción solo avisa", () => {
    expect(() => loadEnv({ require: ["MISSION_CONTROL_SECRET"] }, { VERCEL_ENV: "preview" })).not.toThrow()
    expect(warnings.join("\n")).toContain("MISSION_CONTROL_SECRET")
  })
})

describe("normalizeTenant", () => {
  it("mapea ids de MC al prefijo del gateway", () => {
    expect(normalizeTenant("flexo")).toBe("FLEXOIMPRESOS")
    expect(normalizeTenant("tamaprint")).toBe("TAMAPRINT")
    expect(normalizeTenant("la-magdalena")).toBe("MAGDALENA")
    expect(normalizeTenant("lamagdalena")).toBe("MAGDALENA")
    expect(normalizeTenant("multyhealth")).toBe("MULTIHEALTH")
    expect(normalizeTenant(" EstudioIndigo ")).toBe("ESTUDIOINDIGO")
    expect(normalizeTenant("otro-tenant")).toBe("OTRO_TENANT")
  })

  it("rechaza ids que podrían inyectar nombres de variable o rutas", () => {
    for (const bad of ["", "../x", "a b", "tama$print", "x/y"]) {
      expect(() => normalizeTenant(bad)).toThrow()
    }
  })
})

describe("getGatewayApiKey", () => {
  it("usa {TENANT}_SAP_API_KEY (canónico) con source tenant", () => {
    const env = { FLEXOIMPRESOS_SAP_API_KEY: "k-flexo", SAP_BACKEND_API_KEY: "k-fallback" }
    expect(getGatewayApiKey("flexo", env)).toEqual({
      key: "k-flexo",
      source: "tenant",
      envName: "FLEXOIMPRESOS_SAP_API_KEY",
    })
  })

  it("acepta los alias en orden y avisa", () => {
    expect(getGatewayApiKey("tamaprint", { TAMAPRINT_API_KEY: "a", SAP_API_KEY_TAMAPRINT: "b" })).toMatchObject({
      key: "b",
      envName: "SAP_API_KEY_TAMAPRINT",
    })
    expect(getGatewayApiKey("tamaprint", { TAMAPRINT_GATEWAY_API_KEY: "g" })?.envName).toBe("TAMAPRINT_GATEWAY_API_KEY")
    expect(warnings.some((w) => w.includes("TAMAPRINT_SAP_API_KEY"))).toBe(true)
  })

  it("no mezcla tenants: la llave de otro tenant no sirve", () => {
    expect(getGatewayApiKey("tamaprint", { FLEXOIMPRESOS_SAP_API_KEY: "k-flexo" })).toBeNull()
  })

  it("cae a SAP_BACKEND_API_KEY con source service", () => {
    expect(getGatewayApiKey("tamaprint", { SAP_BACKEND_API_KEY: "k" })).toEqual({
      key: "k",
      source: "service",
      envName: "SAP_BACKEND_API_KEY",
    })
    expect(getGatewayApiKey(undefined, { SAP_B1_BACKEND_API_KEY: "k2" })?.envName).toBe("SAP_B1_BACKEND_API_KEY")
  })

  it("devuelve null si no hay ninguna llave", () => {
    expect(getGatewayApiKey("tamaprint", {})).toBeNull()
  })
})
