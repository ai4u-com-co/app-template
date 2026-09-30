import { describe, expect, it, vi } from "vitest"
import changelogrc from "@/.changelogrc.json"
import { getChangelogConfig } from "@/lib/changelog"
import { SERVICE_ID } from "@/lib/service"

describe("changelog: .changelogrc.json es la fuente única de clientId/appId", () => {
  it("appId del hook = SERVICE_ID de lib/service.ts", () => {
    expect(changelogrc.appId).toBe(SERVICE_ID)
  })

  it("el pill usa el mismo clientId/appId que el hook, aunque haya env legados", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {})
    const cfg = getChangelogConfig({
      NEXT_PUBLIC_CHANGELOG_URL: "https://changelog.example",
      NEXT_PUBLIC_CHANGELOG_CLIENT: "otro-cliente",
      NEXT_PUBLIC_CHANGELOG_APP: "otra-app",
    })
    expect(cfg).toEqual({ serviceUrl: "https://changelog.example", clientId: changelogrc.clientId, appId: SERVICE_ID })
  })

  it("sin env de URL cae al serviceUrl de .changelogrc.json", () => {
    expect(getChangelogConfig({})?.serviceUrl).toBe(changelogrc.serviceUrl)
  })

  it("si falta clientId o appId no se renderiza el pill (nunca inventa un cliente)", () => {
    expect(getChangelogConfig({}, { serviceUrl: "https://x", clientId: "", appId: SERVICE_ID })).toBeNull()
    expect(getChangelogConfig({}, { serviceUrl: "https://x", clientId: "ai4u" })).toBeNull()
  })
})
