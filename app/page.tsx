import { getExampleDashboard } from "@/lib/example"
import { SERVICE_ID } from "@/lib/service"

/**
 * Página de EJEMPLO mobile-first (reemplázala por la del módulo). Muestra los
 * patrones del ecosistema para que ninguna pantalla tenga scroll horizontal a 375px:
 *   - Diseñada a 375px y ensanchada con los breakpoints canónicos del design
 *     system (sm 640 · md 768 · lg 1024, de @ai4u/design-system/styles/tailwind-theme.css).
 *   - Colores, radios, espacios y tipografía con tokens CSS del design system
 *     (`var(--ai4u-*)`), nunca colores hardcodeados.
 *   - Anchos fluidos (`w-full`, grid con `minmax(0,1fr)`), `min-w-0` + `break-words`
 *     en textos largos, texto ≥ 12px.
 *   - Tabla: tarjetas apiladas en móvil y tabla real desde `md`, dentro de su propio
 *     contenedor con `overflow-x-auto` (nunca desplaza la página).
 * Nota: los componentes React del design system requieren MUI (peer deps); esta
 * plantilla no lo instala, por eso el ejemplo usa sus tokens + Tailwind.
 */
const card =
  "min-w-0 rounded-[var(--ai4u-radius-card)] border border-[var(--ai4u-border-color)] bg-[var(--ai4u-bg-surface)] p-[var(--ai4u-space-md)]"

export default function HomePage() {
  const { kpis, rows } = getExampleDashboard()

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <header className="mb-6 min-w-0">
        <h1 className="break-words">AI4U App Template</h1>
        <p className="mt-2 text-[length:var(--ai4u-fs-sm)] text-[color:var(--ai4u-text-secondary)]">
          Servicio <code className="break-all">{SERVICE_ID}</code>. Página de ejemplo: reemplázala — ver README.md.
        </p>
      </header>

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <article key={kpi.label} className={card}>
            <p className="text-[length:var(--ai4u-fs-xs)] uppercase tracking-[var(--ai4u-tracking-caption)] text-[color:var(--ai4u-text-secondary)]">
              {kpi.label}
            </p>
            <p className="mt-1 break-words text-[length:var(--ai4u-fs-h3)] font-semibold">{kpi.value}</p>
            <p className="mt-1 text-[length:var(--ai4u-fs-xs)] text-[color:var(--ai4u-text-secondary)]">{kpi.hint}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="pedidos" className="mt-8 min-w-0">
        <h2 id="pedidos" className="mb-3">Pedidos recientes</h2>

        {/* Móvil: tarjetas apiladas. */}
        <ul className="grid grid-cols-1 gap-3 md:hidden">
          {rows.map((row) => (
            <li key={row.id} className={card}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <code className="text-[length:var(--ai4u-fs-sm)]">{row.id}</code>
                <span className="text-[length:var(--ai4u-fs-sm)] font-semibold">{row.valor}</span>
              </div>
              <p className="mt-1 break-words">{row.cliente}</p>
              <p className="mt-1 text-[length:var(--ai4u-fs-sm)] text-[color:var(--ai4u-text-secondary)]">{row.estado}</p>
            </li>
          ))}
        </ul>

        {/* Desde md: tabla, con scroll SOLO dentro de su contenedor si no cabe. */}
        <div className={`${card} hidden overflow-x-auto p-0 md:block`}>
          <table className="w-full border-collapse text-left text-[length:var(--ai4u-fs-sm)]">
            <thead className="text-[color:var(--ai4u-text-secondary)]">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Pedido</th>
                <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--ai4u-border-color)]">
                  <td className="whitespace-nowrap px-4 py-3"><code>{row.id}</code></td>
                  <td className="px-4 py-3">{row.cliente}</td>
                  <td className="whitespace-nowrap px-4 py-3">{row.estado}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">{row.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
