import { configureTransport, setServiceName } from "@ai4u/platform/logger"
import { loadEnv, readEnv } from "@/lib/env"
import { SERVICE_ID } from "@/lib/service"

/**
 * Arranca la observabilidad central: nombra el servicio en los logs y, si hay
 * ingest configurado, activa el envío de logs al panel admin (@ai4u/platform).
 * Se llama UNA vez desde instrumentation.ts (arranque del runtime Node).
 */
let started = false
export function bootstrapObservability(): void {
  if (started) return
  started = true

  // Valida el env de una vez al arrancar: en producción de Vercel lanza con la
  // lista completa de faltantes; en dev/preview solo avisa.
  const env = loadEnv({
    require: ["MISSION_CONTROL_SECRET"],
    optional: ["PLATFORM_INGEST_URL", "INGEST_SECRET", "SAP_BACKEND_URL", "SERVICE_ID"],
  })

  setServiceName(env.SERVICE_ID ?? SERVICE_ID)
  const endpoint = env.PLATFORM_INGEST_URL
  const secret = env.INGEST_SECRET
  if (endpoint && secret) {
    configureTransport({ endpoint, secret })
  } else if (readEnv("PLATFORM_INGEST_URL") || readEnv("INGEST_SECRET")) {
    console.warn("[observability] PLATFORM_INGEST_URL e INGEST_SECRET deben ir juntos; transporte de logs desactivado")
  }
}
