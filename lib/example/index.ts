// Datos de EJEMPLO para app/page.tsx (reemplázalos por la lógica real del módulo).
// Viven en lib/ por la regla lib/ vs app/: la página solo presenta.
export interface ExampleKpi {
  label: string
  value: string
  hint: string
}

export interface ExampleRow {
  id: string
  cliente: string
  estado: string
  valor: string
}

export function getExampleDashboard(): { kpis: ExampleKpi[]; rows: ExampleRow[] } {
  return {
    kpis: [
      { label: "Pedidos del mes", value: "128", hint: "+12 vs. mes anterior" },
      { label: "Ventas", value: "$ 84,2 M", hint: "COP, sin IVA" },
      { label: "Cumplimiento", value: "93 %", hint: "Entregas a tiempo" },
      { label: "Cartera vencida", value: "$ 6,1 M", hint: "Más de 30 días" },
    ],
    rows: [
      { id: "PED-1042", cliente: "Distribuidora Andina de Empaques S.A.S.", estado: "En producción", valor: "$ 4.250.000" },
      { id: "PED-1043", cliente: "Laboratorios del Valle", estado: "Facturado", valor: "$ 1.980.000" },
      { id: "PED-1044", cliente: "Comercializadora Internacional del Caribe Ltda.", estado: "Pendiente", valor: "$ 12.400.000" },
    ],
  }
}
