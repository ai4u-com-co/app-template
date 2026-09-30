/**
 * Nombre de la cookie de sesión SSO de Mission Control. Es el default de
 * `readIdentity` en @ai4u/platform/auth: si lo cambias acá, pasa `cookieName`
 * en `sessionAuth` de cada ruta.
 *
 * TODO(mc-sso 1.2.0): reemplazar por `MC_SESSION_COOKIE` de @ai4u/mc-sso cuando
 * se publique, para que el nombre viva en un solo paquete.
 */
export const SESSION_COOKIE = "mc_session"

/**
 * Duración de la sesión local tras el handoff: 8 h, una jornada de planta
 * (FLX-091: con 1 h la sesión vencía a mitad de turno y se perdían cambios).
 */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000
