# AI4U App Template

Plantilla **única** para crear un módulo/app nuevo del ecosistema superAI (Next.js 16 + Tailwind v4).
Reemplaza a `ai4u-module-template` (se archivará con OK de Mariano).

## Qué trae de fábrica

| Pieza | Dónde | Qué hace |
|---|---|---|
| Identidad del servicio | `lib/service.ts` | `SERVICE_ID`: el **único** lugar donde se escribe el id de la app |
| Env vars | `lib/env.ts` | Punto único de lectura. Nombre canónico → alias legado (con aviso, sin valores). `loadEnv` valida todo al arrancar |
| SSO de Mission Control | `app/api/mc-auth/route.ts` | Recibe el handoff de MC (`verifyMcToken` + `createSession` de `@ai4u/mc-sso`) y deja la cookie `mc_session` |
| Rutas de API | `app/api/example/route.ts` | `withApiHandler` + `requireModule` + llamada al gateway SAP con el tenant **de la sesión** |
| Gateway SAP | `lib/sap-gateway.ts` | `SAP_BACKEND_URL` + `X-API-Key` = `{TENANT}_SAP_API_KEY`. Sin tenant por defecto |
| Observabilidad | `instrumentation.ts` + `lib/observability.ts` | Nombra el servicio y envía logs con `PLATFORM_INGEST_URL` + `INGEST_SECRET` |
| Pill de changelog | `components/ChangelogPill.tsx` (`@ai4u-labs/changelog-client`) | Se renderiza en `app/layout.tsx` si hay `NEXT_PUBLIC_CHANGELOG_URL` + `NEXT_PUBLIC_CHANGELOG_CLIENT` |
| Design system | `app/globals.css` | `@ai4u/design-system` (tokens + breakpoints canónicos) |
| CI | `.github/workflows/ci.yml` | install → lint → type-check → test → build |

Pines: `@ai4u/platform#v0.4.1`, `@ai4u/mc-sso#v1.1.0`, `@ai4u/design-system#v1.4.0` (owner `ai4u-com-co`),
`@ai4u-labs/changelog-client@^0.3.0` (npm).

## Crear un módulo nuevo en 7 pasos

> Leyenda: **[código]** lo haces en el repo · **[manual]** clic/ajuste fuera del repo, todavía no automatizado.

### 1. Crear el repo — [manual]
GitHub → `ai4u-com-co/app-template` → **Use this template → Create a new repository** (owner `ai4u-com-co`).

```bash
npm install
cp .env.example .env.local
npm run dev
```

### 2. Renombrar — [código]
Elige el id del módulo (minúsculas, sin espacios; ej. `inventario`) y reemplaza `app-template` en:

- `lib/service.ts` → `SERVICE_ID` (lo usan SSO, `requireModule`, logs, health y el `appId` por defecto del pill)
- `.changelogrc.json` → `appId`
- `package.json` → `name`
- `app/layout.tsx` → `metadata.title`

Borra `app/api/example` cuando tengas tu primera ruta real (y conserva el patrón).

### 3. Registrar en Mission Control — [código, otro repo]
En `mission-control`, `lib/tenants/modules.ts`, agrega una factory siguiendo `kpiModule()`:

```ts
export function inventarioModule(options: { color?: string } = {}): TenantModule {
  return {
    id: "inventario",                 // = MODULE_ID de lib/service.ts
    // name, subtitle, description, icon, color, tech, features...
    type: "webapp",
    envKey: "NEXT_PUBLIC_INVENTARIO_URL",
    liveUrl: process.env.NEXT_PUBLIC_INVENTARIO_URL ?? null,
    sso: { serviceId: "inventario" }, // = SERVICE_ID; si no coincide, /api/mc-auth responde 401
    repo: "https://github.com/ai4u-com-co/<repo>",
  }
}
```

Y agrégala al array `modules` de **cada** `lib/tenants/<tenant>.ts` que la use. Lo que sigue siendo manual y en
otros lugares (ver `_ONBOARDING.md` del inventario de env, 29-sep-2026):

- En el proyecto Vercel **mission-control**: `NEXT_PUBLIC_<MOD>_URL` (y opcional `<MOD>_URL` server-side).
- Catálogo `FALLBACK` en `mission-control-admin/lib/modules-catalog.ts` (duplicado conocido).
- Dar acceso a usuarios (`allowed_modules`) desde mission-control-admin → Usuarios.

### 4. Llave del gateway SAP — [manual]
Si la app consulta SAP, cada tenant que la use necesita una llave aceptada por `sap-b1-backend`
(hoy: un slot `{TENANT}_API_KEY_N` en el proyecto del gateway — los de tamaprint están agotados,
ver `sap-b1-backend/lib/auth.ts`). En **esta** app se carga como `{TENANT}_SAP_API_KEY`
(`TAMAPRINT_SAP_API_KEY`, `FLEXOIMPRESOS_SAP_API_KEY`, …). El tenant nunca se configura: sale de la sesión.

### 5. Changelog — [manual]
El `appId` se auto-registra en el primer POST al changelog-service. Instalar el hook con `npx changelog-hook init`
(o el MCP `add_changelog_entry`, ver `CLAUDE.md`). Para el pill: `NEXT_PUBLIC_CHANGELOG_CLIENT` = cliente dueño de la app.

### 6. Variables de entorno en Vercel — [manual]
Crear el proyecto en el team `ai4u`. Ver `.env.example` (solo nombres canónicos, agrupados por clase):

- **platform** (`[SHARED]`): `SAP_BACKEND_URL`, `PLATFORM_INGEST_URL`, `INGEST_SECRET`, `NEXT_PUBLIC_CHANGELOG_URL`,
  `CHANGELOG_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `MISSION_CONTROL_URL`.
  Serán **Shared Environment Variables del team**: se *vinculan* al proyecto, no se copian.
  **Hoy la Fase 2 (crear las compartidas) no está hecha**: hasta entonces hay que cargarlas por proyecto.
- **service**: `MISSION_CONTROL_SECRET` (obligatoria; sin ella la app no arranca en producción),
  `NEXT_PUBLIC_CHANGELOG_CLIENT`, `NEXT_PUBLIC_CHANGELOG_APP` y las opcionales que aplique.
- **tenant**: `{TENANT}_SAP_API_KEY` por cada tenant (paso 4).
- **provider**: credenciales externas propias de la app.

### 7. Deploy y verificación — [manual]
Push a `main` → Vercel despliega. Verificar con evidencia, no con "el build pasó":

1. `GET /api/health` → 200.
2. Desde Mission Control, abrir el tile → debe terminar en `/` con la cookie `mc_session` (si da 401: `SERVICE_ID` ≠ `sso.serviceId` o secreto distinto).
3. `GET /api/example` con la sesión → `gatewayTenant` correcto y `gatewayStatus` 200.
4. Pill de versión visible abajo a la derecha.

## Probar en local sin secretos de producción

```bash
npm test                   # tests unitarios de lib/env.ts y lib/sap-gateway.ts
npm run lint && npm run type-check && npm run build
```

Para probar el SSO sin MC: con `MISSION_CONTROL_SECRET=cualquier-cosa-local` en `.env.local`, genera un token de prueba
(`createMcToken("<tenant>", "<SERVICE_ID>", "Nombre", "cualquier-cosa-local", { allowedModules: ["<SERVICE_ID>"] })`
de `@ai4u/mc-sso`) y haz `POST /api/mc-auth` con `token=<token>` como form. Para el gateway, apunta
`SAP_BACKEND_URL` a un servidor local de prueba. **Nunca** copies secretos de producción a `.env.local`.

## Reglas

Ver `CLAUDE.md` (lib/ vs app/, `withApiHandler` en toda ruta, nada de `process.env` suelto, sin tenant hardcodeado,
mobile first). Si vas a publicar un paquete compartido (no una app), no uses esta plantilla: sigue el patrón de
`sistemaDiseno`/`platform`/`mc-sso`/`config`.
