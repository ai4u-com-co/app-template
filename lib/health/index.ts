// Ejemplo de service layer: la lógica vive acá, NUNCA en el route handler ni en un componente.
// Ver CLAUDE.md — "Separación obligatoria: lib/ vs app|components/".
import { SERVICE_ID } from "@/lib/service"

export function getHealthStatus() {
  return { status: "ok", service: SERVICE_ID, timestamp: new Date().toISOString() }
}
