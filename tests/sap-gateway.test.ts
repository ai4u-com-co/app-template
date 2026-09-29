import { beforeEach, describe, expect, it, vi } from "vitest"
import { __resetEnvWarnings } from "@/lib/env"
import { buildGatewayUrl, sapGatewayFetch, toGatewayTenant } from "@/lib/sap-gateway"

beforeEach(() => __resetEnvWarnings(() => {}))

function okFetch(body: unknown, status = 200) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  )
}

describe("toGatewayTenant / buildGatewayUrl", () => {
  it("traduce el id de MC al id del gateway", () => {
    expect(toGatewayTenant("flexo")).toBe("flexoimpresos")
    expect(toGatewayTenant("tamaprint")).toBe("tamaprint")
  })

  it("arma /api/v1/{tenant}/{path} respetando un base con o sin barra final", () => {
    expect(buildGatewayUrl("https://gw.example", "flexo", "/kpis?x=1").toString()).toBe(
      "https://gw.example/api/v1/flexoimpresos/kpis?x=1",
    )
    expect(buildGatewayUrl("https://gw.example/base/", "tamaprint", "health").toString()).toBe(
      "https://gw.example/base/api/v1/tamaprint/health",
    )
  })

  it("no deja escapar del prefijo del tenant", () => {
    expect(() => buildGatewayUrl("https://gw.example", "tamaprint", "../flexoimpresos/kpis")).toThrow()
    expect(() => buildGatewayUrl("https://gw.example", "tamaprint", "a/%2e%2e/b")).toThrow()
  })
})

describe("sapGatewayFetch", () => {
  const env = {
    SAP_BACKEND_URL: "https://gw.example",
    TAMAPRINT_SAP_API_KEY: "k-tama",
    FLEXOIMPRESOS_SAP_API_KEY: "k-flexo",
  }

  it("usa el tenant recibido (de la sesión) y SU llave en X-API-Key", async () => {
    const fetchMock = okFetch({ ok: true })
    const res = await sapGatewayFetch("flexo", "health", {}, { env, fetch: fetchMock })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://gw.example/api/v1/flexoimpresos/health")
    const headers = new Headers(init?.headers)
    expect(headers.get("x-api-key")).toBe("k-flexo")
    expect(res).toMatchObject({
      status: 200,
      ok: true,
      data: { ok: true },
      gatewayTenant: "flexoimpresos",
      keySource: "tenant",
      keyEnvName: "FLEXOIMPRESOS_SAP_API_KEY",
    })
  })

  it("dos tenants distintos → dos llaves distintas (sin tenant por defecto)", async () => {
    const fetchMock = okFetch({})
    await sapGatewayFetch("tamaprint", "health", {}, { env, fetch: fetchMock })
    await sapGatewayFetch("flexo", "health", {}, { env, fetch: fetchMock })
    const keys = fetchMock.mock.calls.map(([, init]) => new Headers(init?.headers).get("x-api-key"))
    expect(keys).toEqual(["k-tama", "k-flexo"])
  })

  it("devuelve status no-2xx del gateway sin lanzar", async () => {
    const res = await sapGatewayFetch("tamaprint", "kpis", {}, { env, fetch: okFetch({ error: "x" }, 401) })
    expect(res.ok).toBe(false)
    expect(res.status).toBe(401)
  })

  it("503 CONFIG_MISSING si falta SAP_BACKEND_URL", async () => {
    await expect(
      sapGatewayFetch("tamaprint", "health", {}, { env: { TAMAPRINT_SAP_API_KEY: "k" }, fetch: okFetch({}) }),
    ).rejects.toMatchObject({ code: "CONFIG_MISSING", httpStatus: 503 })
  })

  it("503 CONFIG_MISSING si falta la llave del tenant, nombrando la variable esperada", async () => {
    const fetchMock = okFetch({})
    await expect(
      sapGatewayFetch("magdalena", "health", {}, { env, fetch: fetchMock }),
    ).rejects.toMatchObject({ code: "CONFIG_MISSING", details: { expected: "MAGDALENA_SAP_API_KEY" } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("502 GATEWAY_UNREACHABLE si el fetch falla", async () => {
    const failing = vi.fn(async () => {
      throw new TypeError("fetch failed")
    })
    await expect(
      sapGatewayFetch("tamaprint", "health", {}, { env, fetch: failing as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: "GATEWAY_UNREACHABLE", httpStatus: 502 })
  })

  it("acepta alias legado de la URL del gateway", async () => {
    const fetchMock = okFetch({})
    await sapGatewayFetch("tamaprint", "health", {}, {
      env: { BACKEND_URL: "https://legacy.example", TAMAPRINT_SAP_API_KEY: "k" },
      fetch: fetchMock,
    })
    expect(fetchMock.mock.calls[0][0]).toBe("https://legacy.example/api/v1/tamaprint/health")
  })
})
