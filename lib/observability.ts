import { configureTransport, setServiceName } from "@ai4u/platform/logger"

// Reemplaza "app-template" por el appId real de este repo (mismo que .changelogrc.json).
const SERVICE_NAME = "app-template"

let started = false
export function bootstrapObservability(): void {
  if (started) return
  started = true
  setServiceName(SERVICE_NAME)
  const endpoint = process.env.PLATFORM_INGEST_URL
  const secret = process.env.INGEST_SECRET
  if (endpoint && secret) configureTransport({ endpoint, secret })
}
