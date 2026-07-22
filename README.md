# AI4U App Template

Plantilla de repo para apps nuevas del ecosistema superAI (Next.js 16 + `@ai4u/design-system` + `@ai4u/platform` + `@ai4u/mc-sso` + changelog service ya wireados).

## Cómo usarla

1. En GitHub: **Use this template → Create a new repository** (botón visible porque este repo está marcado como template).
2. Buscar y reemplazar en todo el repo: `app-template` → `<nombre-real-del-repo>` (aparece en `package.json`, `.env.example`, `.changelogrc.json`, `lib/observability.ts`).
3. `npm install`
4. Crear la app en el **changelog-service** con `add_changelog_entry` (ver CLAUDE.md) usando el `appId` nuevo.
5. Configurar env vars reales en Vercel (`PLATFORM_INGEST_URL`, `INGEST_SECRET`, y las que agregue la app — nunca commitear valores reales, solo `.env.example`).
6. Si el repo va a distribuir un paquete compartido (no una app), no partas de esta plantilla — sigue el patrón de `sistemaDiseno`/`platform`/`mc-sso`/`config` (dist commiteado + CI de sincronización).
7. Borrar esta sección del README y escribir la real del proyecto.

## Qué trae de fábrica

- **`lib/` vs `app/`** — separación de lógica de negocio y presentación desde el primer commit (ver CLAUDE.md).
- **`withApiHandler`** en el único endpoint de ejemplo (`app/api/health`) — requestId, logging estructurado y auth consistentes en cada ruta nueva.
- **Observabilidad** (`@ai4u/platform`) wireada vía `instrumentation.ts`.
- **CI** (`.github/workflows/ci.yml`): lint + type-check + build en cada push/PR.
- **Changelog pill** configurado (`.changelogrc.json` + env vars) — falta solo registrar el `appId` en el servicio.

Ver `CLAUDE.md` para las reglas de arquitectura que este repo espera que sigas.
