# AI4U App Template

Plantilla **única** para crear una app/módulo nuevo del ecosistema superAI (Next.js 16 + Tailwind v4).
Reemplaza a `ai4u-module-template` (se archivará con OK de Mariano).

## Qué trae de fábrica

| Pieza | Dónde | Qué hace |
|---|---|---|
| Identidad del servicio | `lib/service.ts` | `SERVICE_ID`: el **único** lugar donde se escribe el id de la app |
| Env vars | `lib/env.ts` → `@ai4u/config/env` | Punto único de lectura (canónico → alias legado con aviso, llaves por tenant). `loadEnv` es estricto solo en Production de Vercel |
| `.env.example` | `scripts/env-example.mjs` | **Generado** desde el contrato con `renderEnvExample`. CI falla si está desincronizado |
| SSO de Mission Control | `app/api/mc-auth/route.ts` | Recibe el handoff de MC (`verifyMcToken` + `createSession`) y deja la cookie `mc_session` por **8 h** |
| Guard de sesión | `proxy.ts` + `lib/page-guard.ts` | Toda página y API exige `mc_session` válida, salvo `/api/mc-auth`, `/api/health` y assets. Sin sesión: 401 amable ("entra desde Mission Control"); sin `MISSION_CONTROL_SECRET`: 503 (fail-closed) |
| Rutas de API | `app/api/example/route.ts` | `withApiHandler` + `requireModule` + gateway SAP con el tenant **de la sesión** |
| Gateway SAP | `lib/sap-gateway.ts` | `SAP_BACKEND_URL` + `X-API-Key` = `{TENANT}_SAP_API_KEY` + `x-consumer` = `SERVICE_ID` (atribución en logs del gateway). Sin tenant por defecto |
| Observabilidad | `instrumentation.ts` + `lib/observability.ts` | Nombra el servicio y envía logs con `PLATFORM_INGEST_URL` + `INGEST_SECRET` |
| Changelog | `.changelogrc.json` + `components/ChangelogPill.tsx` | Pill de versión y hook pre-commit leen el **mismo** `.changelogrc.json` (ver abajo) |
| Design system | `app/globals.css`, `app/page.tsx` | Tokens `var(--ai4u-*)` + breakpoints canónicos. `app/page.tsx` es un ejemplo mobile-first sin scroll horizontal a 375px |
| CI | `.github/workflows/ci.yml` | install → env:check → lint → type-check → test → build (+ gitleaks en `secret-scan.yml`) |

### Pines (los reales de `package.json`)

| Paquete | Versión |
|---|---|
| `next` / `eslint-config-next` | `16.2.6` |
| `react` / `react-dom` | `19.2.4` |
| `@ai4u/platform` | `github:ai4u-com-co/platform#v0.5.0` |
| `@ai4u/mc-sso` | `github:ai4u-com-co/mc-sso#v1.1.0` |
| `@ai4u/design-system` | `github:ai4u-com-co/sistemaDiseno#v1.4.0` |
| `@ai4u/config` | `github:ai4u-com-co/config#v0.2.0` |
| `@ai4u-labs/changelog-client` | `^0.3.0` (npm) — es el nombre real del paquete; `@tamaprint/changelog-client` es un nombre viejo |

Los paquetes `@ai4u/*` se pinean por **tag**, nunca por rama.

## Alta de una app nueva

> **[código]** lo haces en el repo · **[manual]** clic/ajuste fuera del repo, todavía no automatizado.

### 1. Crear el repo desde la plantilla — [manual]
GitHub → `ai4u-com-co/app-template` → **Use this template → Create a new repository** (owner `ai4u-com-co`).

```bash
npm install
cp .env.example .env.local      # completar SOLO con valores locales, nunca de producción
npm run dev
```

### 2. Cambiar la identidad en `lib/service.ts` — [código]
Elige el id (minúsculas, sin espacios; ej. `inventario`) y cámbialo en:

- `lib/service.ts` → `SERVICE_ID` (lo usan SSO, `requireModule`, logs, health y `x-consumer`).
- `.changelogrc.json` → `appId` (**debe** ser igual a `SERVICE_ID`; `npm test` falla si no).
- `package.json` → `name` y `app/layout.tsx` → `metadata.title`.

Reemplaza `app/page.tsx` (ejemplo) y borra `app/api/example` + `lib/example` cuando tengas tu primera ruta real
(conserva los patrones).

### 3. Variables mínimas — [manual, proyecto Vercel en el team `ai4u`]
`.env.example` lista todas, generado desde el contrato. Mínimo para que la app funcione:

- `MISSION_CONTROL_SECRET` — **obligatoria**. Mismo valor con el que Mission Control firma el token de este
  servicio (`MISSION_CONTROL_SECRET` o `MISSION_CONTROL_SECRET_<SERVICEID>` en MC). Sin ella la app no arranca en
  Production y el guard responde 503.
- `MISSION_CONTROL_URL` — para el botón "Ir a Mission Control" de la pantalla sin sesión.
- Si consulta SAP: `SAP_BACKEND_URL` y `{TENANT}_SAP_API_KEY` por cada tenant que la use (una llave aceptada por
  `sap-b1-backend` para ese tenant). El tenant nunca se configura: sale de la sesión.
- Logs: `PLATFORM_INGEST_URL` + `INGEST_SECRET` (van juntas).

Las de clase **platform** serán Shared Environment Variables del team (se *vinculan*, no se copian); mientras la
Fase 2 no esté hecha, se cargan por proyecto. Si la app empieza a leer una variable nueva: agrégala a
`ENV_EXAMPLE_NAMES` en `scripts/env-example.mjs` y corre `npm run env:example` (el test falla si el código lee
con `readEnv()` una variable que no está en la lista).

### 4. Registrar en el catálogo de Mission Control — [código, otro repo]
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

Agrégala al array `modules` de **cada** `lib/tenants/<tenant>.ts` que la use. Además (hoy manual y en otros lugares):

- Proyecto Vercel **mission-control**: `NEXT_PUBLIC_<MOD>_URL` (y, si aplica, `MISSION_CONTROL_SECRET_<SERVICEID>`).
- `mission-control-admin/lib/modules-catalog.ts` → catálogo `FALLBACK` (duplicado conocido).
- Dar acceso a usuarios (`allowed_modules`) desde mission-control-admin → Usuarios.

### 5. Changelog — [código + manual]
**Fuente única de `clientId`/`appId`: `.changelogrc.json`.** Lo leen el hook pre-commit (`changelog-hook run`) y el
pill (`lib/changelog.ts`); `appId` = `SERVICE_ID`. La URL del servicio sale de `NEXT_PUBLIC_CHANGELOG_URL` (variable
de plataforma) o, si no está, del `serviceUrl` del mismo archivo. Ya no se usan `NEXT_PUBLIC_CHANGELOG_CLIENT/_APP`.

Instalar el hook (una vez por clon; los hooks de git no se versionan):

```bash
CHANGELOG_API_KEY=<la-key-que-te-da-Mariano> npm run changelog:init
# o con CHANGELOG_API_KEY ya en .env.local:  npm run changelog:init
```

`changelog:init` valida que `appId` = `SERVICE_ID` y corre `changelog-hook init` con los valores de
`.changelogrc.json` (deja la key en `.env.local`, que está en `.gitignore`). El `appId` se auto-registra en el
primer POST. Alternativa sin hook: el MCP `add_changelog_entry` (ver `CLAUDE.md`).

### 6. Deploy y verificación — [manual]
Push a `main` → Vercel despliega. Verificar con evidencia, no con "el build pasó":

1. `GET /api/health` → 200 (es pública).
2. `GET /` sin sesión → 401 con la pantalla "Tu sesión no está activa".
3. Desde Mission Control, abrir el tile → termina en `/` con la cookie `mc_session` (8 h). Si da 401:
   `SERVICE_ID` ≠ `sso.serviceId` o secreto distinto.
4. `GET /api/example` con la sesión → `gatewayTenant` correcto y `gatewayStatus` 200.
5. Pill de versión visible abajo a la derecha.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `type-check` / `test` | Verificación (todo corre en CI) |
| `npm run env:example` | Regenera `.env.example` desde el contrato |
| `npm run env:check` | Falla si `.env.example` está desactualizado (CI) |
| `npm run changelog:init` | Instala el hook pre-commit del changelog con `.changelogrc.json` |

## Probar en local sin secretos de producción

```bash
npm test                   # env, gateway (x-consumer), guard/proxy, receptor SSO, changelog, .env.example
npm run lint && npm run type-check && npm run build
```

Para entrar a la app sin MC: pon `MISSION_CONTROL_SECRET=cualquier-cosa-local` en `.env.local`, genera un token con
`createMcToken("<tenant>", "<SERVICE_ID>", "Nombre", "cualquier-cosa-local", { allowedModules: ["<SERVICE_ID>"] })`
de `@ai4u/mc-sso` y haz `POST /api/mc-auth` con `token=<token>` como form (el navegador queda con la cookie). Para el
gateway, apunta `SAP_BACKEND_URL` a un servidor local de prueba. **Nunca** copies secretos de producción a `.env.local`.

## Pendiente conocido

- `app/api/mc-auth/route.ts` se reemplazará por `createMcAuthHandler` de `@ai4u/mc-sso` 1.2.0 cuando se publique
  (ver el `TODO(mc-sso 1.2.0)` en el archivo y en `lib/session.ts`).

## Reglas

Ver `CLAUDE.md` (lib/ vs app/, `withApiHandler` en toda ruta, nada de `process.env` suelto, sin tenant hardcodeado,
mobile first). Si vas a publicar un paquete compartido (no una app), no uses esta plantilla: sigue el patrón de
`sistemaDiseno`/`platform`/`mc-sso`/`config`.
