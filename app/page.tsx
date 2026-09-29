import { SERVICE_ID } from "@/lib/service"

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-semibold">AI4U App Template</h1>
      <p className="mt-2 text-sm opacity-70">
        Servicio <code>{SERVICE_ID}</code>. Reemplaza esta página — ver README.md para crear un módulo nuevo.
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-5 text-sm">
        <li><code>POST /api/mc-auth</code> — receptor del handoff SSO de Mission Control.</li>
        <li><code>GET /api/example</code> — ruta protegida + llamada al gateway SAP con el tenant de la sesión.</li>
        <li><code>GET /api/health</code> — health check.</li>
      </ul>
    </main>
  )
}
