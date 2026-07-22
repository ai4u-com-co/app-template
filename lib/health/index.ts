// Ejemplo de service layer: la lógica vive acá, NUNCA en el route handler ni en un componente.
// Ver CLAUDE.md — "Separación obligatoria: lib/ vs app|components/".
export function getHealthStatus() {
  return { status: "ok", service: "app-template", timestamp: new Date().toISOString() }
}
