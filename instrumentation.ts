// Next.js instrumentation hook — corre una vez al arrancar el runtime.
// Nombra el servicio (SERVICE_ID de lib/service.ts) y configura el transporte de
// logs de @ai4u/platform con PLATFORM_INGEST_URL + INGEST_SECRET (lib/observability.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapObservability } = await import("@/lib/observability")
    bootstrapObservability()
  }
}
