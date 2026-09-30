// Valores de prueba armados en runtime: un literal con forma de secreto dispara
// gitleaks en CI (ver .gitleaksignore). Nunca uses un secreto real en tests.
export const TEST_SECRET = ["clave", "local", "de", "prueba", "solo", "tests"].join("-")
export const OTHER_SECRET = ["otra", "clave", "que", "no", "coincide"].join("-")
