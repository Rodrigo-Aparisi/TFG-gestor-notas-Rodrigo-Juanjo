# Security Policy — Olympus Scribe

## Versiones soportadas

| Versión | Soporte de seguridad |
|---|---|
| rama `main` | Activo |
| ramas de feature | No |

## Reportar una vulnerabilidad

Para reportar una vulnerabilidad de seguridad:

1. **NO abras un issue público** — podría exponer la vulnerabilidad antes de que esté parcheada.
2. Envía un email a rodrigop.aparisi.olivar@gmail.com con el asunto `[SECURITY] <descripción breve>`.
3. Incluye: descripción del problema, pasos para reproducirlo, impacto estimado y, si es posible, un PoC (proof of concept).
4. Recibirás respuesta en menos de 72 horas con el plan de acción.

## Medidas de seguridad implementadas

- JWT con refresh tokens (cookie HttpOnly, `SameSite=Strict`), blacklist en BD, expiración 1h/7d.
- bcrypt (10 rondas) para el hash de contraseñas.
- Rate limiting por IP en endpoints sensibles (login, registro, reset de contraseña, uploads).
- Validación de inputs con Zod (`.strict()`).
- Prevención de path traversal en uploads (`safeDeleteFile`, `extractSafeRelativePath`).
- CSP restrictiva y HSTS en producción vía Helmet.
- CORS con whitelist explícita (`ALLOWED_ORIGINS`).
- Logs con redacción automática de campos sensibles (`redactSensitive`).
- TLS obligatorio para la conexión a PostgreSQL en producción.

## Dependencias con vulnerabilidades conocidas

Las CVEs de `react-scripts@5.0.1` (transitivas de webpack) están pendientes de resolución
mediante la migración a Vite (planificada en el roadmap). No son explotables en el contexto
de este proyecto: afectan al bundler de desarrollo, no al runtime de producción.
