# AI4U App Template — Developer Guide

Plantilla base para repos nuevos del ecosistema superAI. Next.js 16 App Router + TypeScript + Tailwind v4, con los paquetes compartidos ya wireados. Ver README.md para el checklist de setup al crear un repo desde esta plantilla.

## Reglas de arquitectura (no negociables)

1. **Nunca reinventar UI.** Usa componentes/tokens de `@ai4u/design-system` en vez de escribir estilos o componentes desde cero. Si algo que necesitas no existe en el design system, créalo ahí primero, no en este repo.
2. **Separación obligatoria: `lib/` vs `app/`|`components/`.** La lógica de negocio (fetching, transformaciones, llamadas a SAP/Supabase) vive en `lib/`. Los route handlers y componentes solo orquestan y presentan — nunca hacen fetch directo ni contienen reglas de negocio. Ver `lib/health/` + `app/api/health/route.ts` como ejemplo mínimo. (La deuda que este patrón evita: `TicketsView.tsx`/`PulseView.tsx` en Mission Control, >1500 líneas cada uno, por mezclar las tres capas.)
3. **Toda ruta de API pasa por `withApiHandler`** (`@ai4u/platform/http`) — da requestId, logging estructurado y auth de servicio/sesión de forma consistente. No escribas handlers crudos.
4. **Observabilidad wireada desde el día uno** (`instrumentation.ts` + `lib/observability.ts`, ya presente). No se debe repetir la auditoría que encontró 14 repos sin esto.
5. **Nunca hardcodear secretos.** Todo va en `.env.example` (sin valores reales) + Vercel env vars. Si el secreto tiene consumidores remotos no coordinados, usar el patrón de rotación `{NOMBRE}_2` en vez de romper el valor activo.

## Versionado — obligatorio antes de cada commit

El historial vive en el **changelog-service central**.

```
MCP tool: add_changelog_entry({
  clientId: "ai4u",
  appId: "<mismo valor que .changelogrc.json>",
  appName: "<Nombre legible, solo la primera vez>",
  bump: "patch",                    // patch | minor | major
  date: "YYYY-MM-DD",
  changes: ["feat: ...", "fix: ..."]
})
```

## Scripts
- `npm run dev` — desarrollo local
- `npm run build` — build de producción
- `npm run lint` / `npm run type-check` — verificación (ambos corren en CI)
