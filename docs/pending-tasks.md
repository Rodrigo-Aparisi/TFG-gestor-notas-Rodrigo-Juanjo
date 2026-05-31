# Tareas pendientes y deuda técnica — Olympus Scribe

Inventario clasificado de incidencias detectadas durante el análisis del código del 2026-05-31 (rama `rodrigo`, commit `f3e3d47`). Las severidades siguen este criterio:

- **Crítico**: vulnerabilidad explotable, fallo que rompe funcionalidad en producción, o pérdida potencial de datos.
- **Alto**: deuda técnica que degrada seriamente seguridad, fiabilidad o mantenibilidad.
- **Medio**: mejora con impacto visible pero no bloqueante.
- **Bajo**: detalle de calidad o coherencia.

Cada ítem incluye:
- **Ubicación** (archivo:línea cuando es puntual).
- **Por qué importa**.
- **Recomendación accionable**.

---

## Índice por categoría

- [Seguridad — Backend](#1-seguridad--backend)
- [Seguridad — Frontend](#2-seguridad--frontend)
- [Fiabilidad y bugs](#3-fiabilidad-y-bugs)
- [Base de datos y persistencia](#4-base-de-datos-y-persistencia)
- [Operativa y despliegue](#5-operativa-y-despliegue)
- [Calidad, tests y CI](#6-calidad-tests-y-ci)
- [UX y accesibilidad](#7-ux-y-accesibilidad)
- [Documentación y consistencia](#8-documentación-y-consistencia)
- [Limpieza de código](#9-limpieza-de-código)
- [Resumen y priorización](#10-resumen-y-priorización)

---

## 1. Seguridad — Backend

### 1.1 [CRÍTICO] Pool de PostgreSQL sin TLS

- **Ubicación**: `backend/src/database.ts:6-12`.
- **Detalle**: `new Pool({...})` no incluye `ssl`. Si el backend se despliega contra una BD gestionada (RDS, Cloud SQL, Render, Supabase, etc.), las credenciales y el tráfico viajan en claro.
- **Recomendación**: añadir `ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true, ca: ... } : false`, con la CA correspondiente. Documentarlo en `.env.example`.

### 1.2 [CRÍTICO] `JWT_SECRET` no se valida al arrancar

- **Ubicación**: `backend/src/middleware/auth.ts` (la comprobación está dentro del middleware, no en startup).
- **Detalle**: si la variable falta, el servidor arranca igual y el error sólo aparece en la primera request autenticada. Riesgo de despliegues silenciosos sin secret.
- **Recomendación**: validar en `backend/src/index.ts` antes de `app.listen()`. Idealmente, centralizar todas las variables obligatorias con Zod (`envSchema.parse(process.env)`) y fallar fast con mensajes claros.

### 1.3 [CRÍTICO] CORS deshabilitado en producción

- **Ubicación**: `backend/src/index.ts:73-78`.
- **Detalle**: si `NODE_ENV === 'production'`, no se registra `cors(...)`. El comentario asume que Nginx aplica la política. Si el deploy se mueve o Nginx no está bien configurado, el navegador puede acabar enviando peticiones sin la cabecera esperada, o peor, cualquier origen puede llamar a la API.
- **Recomendación**: configurar `cors({ origin: <lista blanca>, credentials: true })` también en producción, leyendo el origin permitido de una variable (`ALLOWED_ORIGINS`).

### 1.4 [CRÍTICO] `multerConfig.ts` y `multerConfigNotes.ts` toman la extensión del cliente

- **Ubicación**:
  - `backend/src/config/multerConfig.ts:57-61` (legacy multi-destino).
  - `backend/src/config/multerConfigNotes.ts:21-25`.
- **Detalle**: aunque el `fileFilter` valida MIME, el nombre se compone con `path.extname(file.originalname)`. Un cliente puede falsificar la cabecera Content-Type y mandar `originalname = "shell.php"`; el archivo se guarda como `note-…-.php`. No es ejecutable bajo `express.static`, pero introduce un vector si en algún momento `/uploads` se sirve por Apache/Nginx con intérprete activo.
- **Recomendación**: usar el patrón ya implementado en `backend/src/middleware/upload.ts` (mapa `ALLOWED_MIME_TO_EXT`) y reemplazar ambos módulos legacy. Es una refactorización con bajo riesgo y elimina la duplicación.

### 1.5 [CRÍTICO] Path traversal potencial en `deleteImage`

- **Ubicación**: `backend/src/config/multerConfig.ts:102-113` y `multerConfigNotes.ts:49-60`.
- **Detalle**: `path.join(__dirname, '..', 'uploads', imageUrl)` no impide segmentos `..` en `imageUrl`. Si el parámetro proviene de input controlado por usuario y se invoca para borrar, se podría salir de `uploads/`.
- **Recomendación**: validar con `pathHelpers.validateSafePath()` (ya existe) o usar `path.resolve()` y comprobar que el resultado empieza por `UPLOAD_DIR`. Negar la operación si no.

### 1.6 [CRÍTICO] `GET /api/password/validate-token/:token` sin rate limit

- **Ubicación**: `backend/src/routes/passwordRoutes.ts:13`.
- **Detalle**: el endpoint comprueba si un token de reset es válido. Sin rate limit, permite enumeración silenciosa (aunque el espacio es enorme, la ausencia de protección es una mala práctica explícita).
- **Recomendación**: aplicar `passwordResetLimiter` o crear uno específico (`tokenValidationLimiter`, 10 req/15min/IP).

### 1.7 [ALTO] `multer` 1.4.5-lts.1 obsoleto y con CVEs conocidos

- **Ubicación**: `backend/package.json:50`.
- **Detalle**: Multer 1.x está deprecated. Existen 2.x con corrección de DoS y mejor manejo de límites.
- **Recomendación**: migrar a `multer@^2` (cambios principales: `multer-storage-cloudinary` no aplica; API casi compatible). Probar tras actualizar.

### 1.8 [ALTO] Vulnerabilidades transitivas (npm audit)

- **Detalle**:
  - Backend: ~16 vulnerabilidades (CVEs en `tar`, `flatted`, `ip-address`, `jws`, `express-rate-limit` por bypass IPv4-mapped IPv6).
  - Frontend: ~58 vulnerabilidades (1 crítica), arrastradas por `react-scripts 5.0.1` y su cadena de `webpack`/`webpack-dev-server`/`ws`/`yaml`.
- **Recomendación**:
  - Ejecutar `npm audit fix` periódicamente; documentar aquellas no resolubles con overrides en `package.json` (`overrides` o `resolutions`).
  - Plan a medio plazo: migrar el frontend a Vite (elimina la mayor parte de las CVEs de `react-scripts`).

### 1.9 [ALTO] Sin HSTS y sin enforcement de HTTPS desde el código

- **Ubicación**: `backend/src/index.ts:30-46` (helmet sin `hsts`).
- **Detalle**: la configuración de Helmet sobrescribe defaults pero deja HSTS implícito; si en producción Nginx no añade `Strict-Transport-Security`, los downgrades quedan posibles.
- **Recomendación**: en producción, dejar a Helmet aplicar `hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }` y verificar con `securityheaders.com`.

### 1.10 [ALTO] Logs sin redacción de campos sensibles

- **Ubicación**: `backend/src/config/logger.ts`.
- **Detalle**: si un controller pasa por error un payload con `password`, `token`, `JWT_SECRET`, Winston lo dejará en consola/fichero.
- **Recomendación**: añadir un `format` personalizado que recursivamente reemplace claves sensibles por `[REDACTED]`. La lista mínima: `password`, `currentPassword`, `newPassword`, `token`, `accessToken`, `refreshToken`, `authorization`.

### 1.11 [ALTO] Schemas Zod permisivos por defecto (no `.strict()`)

- **Ubicación**: `backend/src/validation/schemas/*.ts`.
- **Detalle**: los esquemas usan `.object({...})` sin `.strict()`, así que los campos extra no se eliminan ni rechazan. Mitiga (no elimina) el riesgo de mass assignment si algún controller usa `req.body` sin destructuring explícito.
- **Recomendación**: añadir `.strict()` (o usar el helper de validación con `whitelist + forbidNonWhitelisted`).

### 1.12 [ALTO] Sin `app.set('trust proxy', ...)`

- **Ubicación**: `backend/src/index.ts`.
- **Detalle**: cuando el backend corra detrás de Nginx/Cloudflare, `req.ip` será la IP del proxy y `express-rate-limit` aplicará el límite a esa IP única (todos los usuarios comparten límite). También afecta a logs.
- **Recomendación**: configurar `app.set('trust proxy', 1)` (o un valor más restrictivo) en producción y validar que `req.ip` devuelve la IP del cliente real.

### 1.13 [ALTO] `loginSchema` no exige password fuerte (legacy compat)

- **Ubicación**: `backend/src/validation/schemas/user.schema.ts:22-26`.
- **Detalle**: aunque registro y cambio de contraseña exigen política fuerte, los usuarios antiguos con passwords débiles siguen pudiendo loguearse. Sin política, los ataques de diccionario son más eficaces.
- **Recomendación**: implementar **upgrade forzoso**: cuando un usuario con password débil intente loguearse, devolver `403` con flag `forcePasswordChange = true` y obligar al cambio en el próximo paso.

### 1.14 [MEDIO] `emailService.sendContactEmail` con regex CRLF poco precisa

- **Ubicación**: `backend/src/services/emailService.ts:88-91`.
- **Detalle**: `safeMessage.replace(/[\r\n\r]/g, ' ')` repite `\r` y deja huecos. La protección funciona, pero el patrón es confuso y debería extenderse al campo `From` real, no solo a `replyTo`.
- **Recomendación**: usar una función única `stripCRLF(s, max)` y aplicarla a todos los headers; usar HTML escape para el cuerpo HTML.

### 1.15 [MEDIO] Falta CSRF en operaciones sensibles desde navegador

- **Ubicación**: rutas de account/password/group.
- **Detalle**: como el token JWT viaja en `Authorization`, el riesgo de CSRF clásico (cookies) es bajo. Pero si en el futuro se introducen cookies httpOnly (recomendado, ver 2.1), faltaría protección CSRF.
- **Recomendación**: cuando se migre el token a cookie httpOnly, añadir doble token CSRF (`csurf`) o `SameSite=Strict`.

### 1.16 [MEDIO] CSP permite `'unsafe-inline'` en estilos y `data:` en imágenes

- **Ubicación**: `backend/src/index.ts:33-42`.
- **Detalle**: deja un margen explotable a inyecciones de estilos. `data:` URIs permiten ataques de exfiltración.
- **Recomendación**: si Tailwind/CSS-in-JS lo permiten, eliminar `'unsafe-inline'` (vía hashes/nonces). Quitar `data:` de `imgSrc` si no se sirve avatar inline en data URL.

### 1.17 [MEDIO] `/uploads/` se salta el rate limit en producción

- **Ubicación**: `backend/src/middleware/rateLimiter.ts:67-70`.
- **Detalle**: `generalApiLimiter` excluye explícitamente `/uploads/`. Si el backend sirve los assets, queda expuesto a flood de descargas.
- **Recomendación**: delegar el servicio de estáticos a Nginx con rate limit propio, o aplicar un limiter específico para `/uploads/` (e.g. 600 req/min/IP).

### 1.18 [MEDIO] Validación de URLs de imágenes en notas

- **Ubicación**: `backend/src/controllers/note/NoteCrudController.ts` (campo `images: TEXT[]`).
- **Detalle**: los items del array son strings sin validar contra una whitelist. Un atacante podría inyectar URLs externas que filtren actividad cuando se renderizan.
- **Recomendación**: validar que cada URL empieza por `/note-images/` o por `APP_URL` (whitelist) en el schema Zod.

### 1.19 [BAJO] Default 5 MB del mensaje de `handleMulterError` desactualizado

- **Ubicación**: `backend/src/config/multerConfigNotes.ts:73`.
- **Detalle**: el mensaje dice “Máximo 5MB” pero el límite real es 25 MB.
- **Recomendación**: parametrizar a partir de la constante `MAX_FILE_SIZE`.

---

## 2. Seguridad — Frontend

### 2.1 [ALTO] Token JWT en `localStorage`

- **Ubicación**: `frontend/src/contexts/AuthContext.tsx`, `services/api.ts`.
- **Detalle**: cualquier XSS exfiltra el token. Es el patrón clásico, pero peligroso.
- **Recomendación**: mover a cookie `HttpOnly, Secure, SameSite=Strict`. Requiere coordinar con backend (set-cookie en login, leer cookie en lugar de Authorization) y añadir CSRF.

### 2.2 [ALTO] `window.location.href = "/login"` para forzar logout

- **Ubicación**: `frontend/src/services/api.ts` (interceptor 401).
- **Detalle**: rompe el ciclo de React (provoca full reload). Aceptable como fallback, pero ideal sería un event bus consumido por `App.tsx` que llame a `navigate('/login')`.
- **Recomendación**: implementar `authEvents` (EventTarget) emitiendo `'session-expired'`, suscripto en un hook montado en App.

### 2.3 [MEDIO] `(err as any)` en `useNotes.ts` y otros

- **Ubicación**: `frontend/src/hooks/useNotes.ts:34, 49`, varios.
- **Detalle**: el cast oculta cambios de contrato del backend (TypeError al deconstruir).
- **Recomendación**: definir un `ApiError` propio y un helper `toApiError(err: unknown): ApiError` para tipar las respuestas.

### 2.4 [MEDIO] No se valida la estructura de `response.data` en consumidores

- **Ubicación**: múltiples llamadas tipo `response.data.data.imageUrl` (`useNotes.ts:170`).
- **Detalle**: si la API responde con otra forma, hay TypeError en runtime.
- **Recomendación**: pasar las respuestas por un schema (Zod en el cliente o `io-ts`) en la frontera (servicio), y devolver tipos seguros.

### 2.5 [MEDIO] `URLSearchParams` y query construction manual

- **Ubicación**: `services/api.ts` (búsquedas de usuarios).
- **Detalle**: hay rutas tipo `?query=${query}` sin encoding.
- **Recomendación**: utilizar `axios` `params: { query }` o `encodeURIComponent`.

### 2.6 [BAJO] `console.error()` en producción

- **Ubicación**: `services/api.ts`, varios hooks.
- **Detalle**: los logs van a la consola del navegador y pueden filtrar datos.
- **Recomendación**: crear un `clientLogger` que solo loguee en `NODE_ENV !== 'production'`.

---

## 3. Fiabilidad y bugs

### 3.1 [ALTO] `setupEmailScheduler` loguea `userId` en lugar de `id` cuando un envío falla

- **Ubicación**: `backend/src/services/emailSchedulerService.ts` (el agente reportó línea 29; verificar).
- **Detalle**: tras `Promise.allSettled`, en el log de error referencia `reminders[index]?.userId` para identificar al recordatorio fallido, cuando debería ser `reminders[index]?.id`. Hace imposible depurar fallos.
- **Recomendación**: corregir el campo en el log y, de paso, alertar (al menos en consola) si la tasa de fallos supera un umbral.

### 3.2 [ALTO] `useUIEffects` puede dejar `document.body.style.overflow` bloqueado

- **Ubicación**: `frontend/src/hooks/useUIEffects.tsx:47, 82`.
- **Detalle**: si la nota se enfoca y un handler intermedio falla, el body queda con scroll bloqueado hasta que el usuario navegue fuera.
- **Recomendación**: usar `useEffect` con cleanup que siempre restaure el overflow, independientemente del estado.

### 3.3 [ALTO] `handleSaveGroup` cierra sobre `newNoteGroup` que puede estar stale

- **Ubicación**: `frontend/src/hooks/useGroupActions.ts:68-93`.
- **Detalle**: el `useCallback` no incluye `newNoteGroup` en sus dependencias; si el state cambia durante la edición, se guarda el valor antiguo.
- **Recomendación**: añadir la dependencia o usar `useRef` para el valor más reciente.

### 3.4 [ALTO] Race condition potencial en refresh de token

- **Ubicación**: `frontend/src/services/api.ts:64-99`.
- **Detalle**: la cola de `refreshSubscribers` se procesa, pero si llegan dos 401 simultáneos antes de que `isRefreshing` se actualice, se podrían disparar dos refresh.
- **Recomendación**: garantizar atomicidad con un `pendingRefreshPromise` único; los demás `await` esa promesa.

### 3.5 [ALTO] Sin `asyncHandler` adoptado en las rutas

- **Ubicación**: existe `backend/src/middleware/errorHandler.ts:135-141`, pero no se usa.
- **Detalle**: si un controller olvida un `try/catch` y la promesa se rechaza, Express 4 no captura el error y el proceso puede colgarse o devolver una respuesta vacía.
- **Recomendación**: aplicar `asyncHandler(controller)` en todos los `router.<method>(...)`. Hacerlo en un commit dedicado y verificar tests.

### 3.6 [ALTO] Sin handlers de `SIGINT`/`SIGTERM` en `index.ts`

- **Ubicación**: `backend/src/index.ts`.
- **Detalle**: el wrapper `start-backend.js` reenvía señales, pero el proceso Node no cierra el `pool` ni espera a que las tareas programadas terminen.
- **Recomendación**: registrar handler que llame `await pool.end()` y `schedule.gracefulShutdown()`.

### 3.7 [MEDIO] `cleanupExpiredTokens` con `setInterval` no se cancela

- **Ubicación**: `backend/src/index.ts:143`.
- **Detalle**: el intervalo no se cancela en el shutdown; sumado al 3.6, hay riesgo de cerrar el pool con queries en vuelo.
- **Recomendación**: guardar el id del intervalo y `clearInterval` en el handler de SIGTERM.

### 3.8 [MEDIO] `console.error` mezclado con Winston

- **Ubicación**: `backend/src/database.ts:17`, `backend/src/config/multerConfig.ts:110`, etc.
- **Detalle**: los errores se pierden si stdout no se está agregando.
- **Recomendación**: reemplazar todos los `console.*` por `logger.*`.

### 3.9 [MEDIO] Mensaje de “Máximo 5MB” inconsistente con el límite real (25 MB)

- **Ubicación**: `multerConfigNotes.ts:73`.
- **Detalle**: ya recogido en 1.19. Confunde al usuario en errores.

### 3.10 [MEDIO] Construcción dinámica de UPDATE en `NoteCrudController`

- **Ubicación**: `backend/src/controllers/note/NoteCrudController.ts` (alrededor de la línea 139, `updateNote`).
- **Detalle**: arma `updateFields` y `values` manualmente con un contador. Aunque las queries siguen parametrizadas, la lógica es frágil ante futuras columnas y propensa a errores de índice.
- **Recomendación**: helper común `buildPartialUpdate(table, allowedFields, payload)` reusable por todos los controllers.

### 3.11 [MEDIO] Falta de transacciones en operaciones multi-paso

- **Ubicación**: NoteSharingController (insert + update permissions), GroupNoteController (insert + upload).
- **Detalle**: si la segunda query falla, queda estado inconsistente.
- **Recomendación**: usar `pool.connect()` + `BEGIN/COMMIT/ROLLBACK` con un helper `withTransaction(client => …)`.

### 3.12 [MEDIO] Sin idempotency keys en POST sensibles

- **Ubicación**: creación de notas, recordatorios, miembros.
- **Detalle**: un reintento del cliente crea duplicados.
- **Recomendación**: aceptar cabecera `Idempotency-Key` y mantener cache TTL 24 h (en BD o Redis).

---

## 4. Base de datos y persistencia

### 4.1 [ALTO] `note_groups.user_id` sin `ON DELETE CASCADE`

- **Ubicación**: `database.sql`, `docker/postgres/init/01_schema.sql` (tabla `note_groups`).
- **Detalle**: a diferencia del resto de FKs a `users`, esta no cascadea. Al borrar un usuario, sus grupos quedan huérfanos referenciando a un usuario inexistente, salvo que el `ON DELETE` por defecto sea `NO ACTION` (que falla la operación).
- **Recomendación**: `ALTER TABLE note_groups ADD CONSTRAINT note_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`. Crear migración.

### 4.2 [ALTO] Falta índice en `note_groups.user_id`

- **Detalle**: queries del tipo `SELECT * FROM note_groups WHERE user_id = $1` hacen full scan.
- **Recomendación**: `CREATE INDEX idx_note_groups_user_id ON note_groups(user_id)`.

### 4.3 [RESUELTO] Doble fuente de verdad del schema

- **Detalle (original)**: `database.sql` y `docker/postgres/init/01_schema.sql` debían sincronizarse a mano y habían divergido (database.sql estaba obsoleto).
- **Resolución**: se unificó en un único `database.sql` canónico; docker-compose lo monta directamente en `/docker-entrypoint-initdb.d`, así que Docker y el setup manual usan el mismo fichero físico. Se eliminó `docker/postgres/init/01_schema.sql`.
- **Pendiente a medio plazo**: introducir un framework de migraciones versionadas (`node-pg-migrate`) que registre qué se aplicó.

### 4.4 [MEDIO] Roles/frecuencias como VARCHAR sin CHECK ni ENUM

- **Ubicación**: `group_members.role`, `reminder_recurrence.frequency`.
- **Detalle**: cualquier string acepta el INSERT; los errores aparecen tarde.
- **Recomendación**: crear `CREATE TYPE group_role AS ENUM ('owner','admin','member')` o, mínimo, añadir `CHECK (role IN (...))`.

### 4.5 [MEDIO] Soft delete sin índice compuesto ni vista

- **Ubicación**: tabla `notes`.
- **Detalle**: queries de papelera filtran `is_deleted = true` sin índice. Las queries normales filtran `is_deleted = false`, también sin índice compuesto. Riesgo de scans completos cuando la tabla crezca.
- **Recomendación**:
  - `CREATE INDEX idx_notes_active ON notes(user_id) WHERE is_deleted = false;` (parcial).
  - `CREATE INDEX idx_notes_trash ON notes(user_id, deleted_at) WHERE is_deleted = true;` (parcial).

### 4.6 [MEDIO] `reminder_recurrence.end_date` puede ser NULL → posible recurrencia infinita

- **Detalle**: la lógica de envío puede generar emails indefinidamente.
- **Recomendación**: forzar `end_date NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year')` o validar en backend.

### 4.7 [MEDIO] Pool de pg sin tuning explícito

- **Ubicación**: `backend/src/database.ts`.
- **Detalle**: usa defaults: `max=10`, sin `connectionTimeoutMillis`, sin `idleTimeoutMillis`.
- **Recomendación**: parametrizar mediante env (`PG_POOL_MAX`, `PG_IDLE_TIMEOUT`, `PG_CONN_TIMEOUT`).

### 4.8 [MEDIO] Sin `statement_timeout`

- **Detalle**: queries lentas pueden bloquear conexiones.
- **Recomendación**: ejecutar `SET statement_timeout = '30s'` por sesión, o `ALTER ROLE app_user SET statement_timeout = '30s'`.

### 4.9 [BAJO] `idx_shared_notes_can_edit` es poco selectivo

- **Detalle**: el índice cubre una columna BOOLEAN. Mejor sería compuesto `(shared_with_id, can_edit)`.
- **Recomendación**: reemplazar por índice compuesto si queries lo justifican.

### 4.10 [BAJO] `cleanup_expired_tokens()` definida pero sin scheduling automático

- **Ubicación**: `backend/migrations/001_add_token_tables.sql`.
- **Detalle**: la función existe pero `pg_cron` está comentado. El backend la sustituye con `setInterval`, pero la función queda como código muerto si nadie la llama.
- **Recomendación**: documentar que solo se usa manualmente, o programarla vía `pg_cron` si la infra lo permite.

---

## 5. Operativa y despliegue

### 5.1 [ALTO] No hay Dockerfile para backend ni frontend

- **Detalle**: `docker-compose.yml` solo arranca PostgreSQL. La app se ejecuta en el host.
- **Recomendación**: añadir `backend/Dockerfile` (multistage: build + runtime con `node:18-alpine`) y `frontend/Dockerfile` (build + servir con nginx-alpine). Incluir healthcheck.

### 5.2 [ALTO] Imágenes en disco local del backend

- **Ubicación**: `backend/uploads/`.
- **Detalle**: bloquea escalado horizontal y caduca al recrear contenedor.
- **Recomendación**: introducir abstracción `StorageProvider` con implementación `LocalStorage` (actual) y `S3Storage` (opcional). Variables `STORAGE_PROVIDER=local|s3`, `S3_BUCKET`, etc.

### 5.3 [ALTO] Tessdata de 48 MB versionado en git sin uso aparente

- **Ubicación**: `backend/tessdata/`, `backend/eng.traineddata`, `backend/spa.traineddata`.
- **Detalle**: añade ~48 MB al clone y no aparecen imports de `tesseract.js` ni `tesseract.js-node` en `package.json`.
- **Recomendación**: confirmar uso. Si no se usa, eliminar y añadir al `.gitignore`. Si se usa, mover a git-lfs o descargar en el build (`npm run prepare`).

### 5.4 [MEDIO] `start.sh` es bash (no compatible con Windows nativo)

- **Detalle**: el proyecto se desarrolla en Windows pero `start.sh` solo corre en Unix.
- **Recomendación**: añadir alternativa Node (extender `start-backend.js`) y eliminar dependencia de bash.

### 5.5 [MEDIO] `npm install` durante `start.sh`

- **Detalle**: `start.sh` ejecuta `npm install` en cada arranque si falta `ts-node`. En producción puede ser lento o introducir cambios en runtime.
- **Recomendación**: separar instalación (build/CI) del arranque.

### 5.6 [BAJO] `docker-compose.yml` sin red explícita

- **Detalle**: usa la red por defecto del compose. No es un fallo, pero dificulta integrar otros servicios.
- **Recomendación**: declarar `networks: { app: ... }` explícitamente.

---

## 6. Calidad, tests y CI

### 6.1 [CRÍTICO] Sin CI/CD

- **Detalle**: no hay `.github/workflows/`. Los tests y el lint nunca corren automáticamente.
- **Recomendación**: añadir workflow para backend y frontend que ejecute `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --coverage` y publique la cobertura.

### 6.2 [ALTO] Cobertura de tests del backend ~12 %

- **Detalle**: dominios sin tests: **reminders, password recovery, account, group notes, services (email, scheduler), file upload, routes en bruto, error handler**.
- **Recomendación**: priorizar tests para account (incluye DELETE), reminders (lógica de fechas) y password recovery (flujo entero con BD).

### 6.3 [ALTO] Frontend sin reporte de cobertura

- **Detalle**: `frontend/coverage/` no existe; tests existentes son fundamentalmente unitarios sobre contextos/hook simples.
- **Recomendación**: añadir `--coverage --watchAll=false` al script `test:ci`. Subir umbral mínimo (e.g. 30 %) tras una primera ronda.

### 6.4 [ALTO] No hay tests E2E

- **Detalle**: tests del backend mockean `pg.Pool`, no validan SQL ni triggers; el frontend sólo prueba componentes aislados.
- **Recomendación**: introducir Playwright para flujos críticos (registro, crear nota, compartir, reset password). Levantar la BD real con `docker compose` en CI.

### 6.5 [ALTO] Backend con `tsconfig.strict: false`

- **Ubicación**: `backend/tsconfig.json`.
- **Detalle**: el frontend está en `strict: true`, pero el backend permite `any` implícito. Pierde una capa de protección.
- **Recomendación**: activar `strict: true` incrementalmente (`noImplicitAny` → `strictNullChecks` → `strict`).

### 6.6 [ALTO] Frontend en TypeScript 4.9.5

- **Detalle**: dos versiones por detrás del backend (5.7); pierde features y arregla menos bugs.
- **Recomendación**: subir a 5.x (compatible con CRA tras override).

### 6.7 [MEDIO] Sin scripts npm para `lint`, `format`, `typecheck`

- **Detalle**: ESLint y Prettier están configurados pero deben invocarse manualmente.
- **Recomendación**: añadir en `backend/package.json` y `frontend/package.json`:
  ```json
  "lint": "eslint . --ext .ts,.tsx",
  "lint:fix": "eslint . --ext .ts,.tsx --fix",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit"
  ```

### 6.8 [MEDIO] Sin pre-commit hooks

- **Detalle**: no hay Husky/lint-staged; el código entra sin formato ni lint validado.
- **Recomendación**: `npx husky-init && npm install lint-staged` y configurar `pre-commit` con `lint-staged`.

### 6.9 [MEDIO] Tests usan mocks sin verificar el SQL

- **Detalle**: `mockPool.query()` acepta cualquier llamada; los tests validan respuestas sin chequear si el SQL es correcto.
- **Recomendación**: en los tests críticos, usar matchers que verifiquen el texto del SQL y los params.

### 6.10 [BAJO] `setupTests.ts` (frontend) silencia warnings de `act()`

- **Detalle**: oculta verdaderos problemas de async/await en tests.
- **Recomendación**: arreglar los warnings; reactivar el log.

---

## 7. UX y accesibilidad

### 7.1 [MEDIO] Modal overlays cierran solo con click, no con teclado

- **Ubicación**: `frontend/src/components/Notes/GroupModal.tsx:90`, `ReminderDetail` (overlay).
- **Detalle**: los `<div>` con `onClick` carecen de `role="button"` y `onKeyDown` (`Escape`).
- **Recomendación**: añadir manejador de `Escape` a nivel del modal y `aria-label="Cerrar"` en el overlay si es interactivo.

### 7.2 [MEDIO] `<div>` con `onClick` sin `role`/`tabIndex`

- **Detalle**: usuarios de teclado/lectores de pantalla quedan fuera.
- **Recomendación**: usar `<button>` siempre que la semántica lo permita; si es `<div>`, añadir `role="button"`, `tabIndex={0}`, `onKeyDown`.

### 7.3 [MEDIO] `SettingsContext.loadFromServer` no reacciona a cambios de usuario

- **Ubicación**: `frontend/src/contexts/SettingsContext.tsx:34-46`.
- **Detalle**: efectos sin deps; si el usuario cambia (logout/login en la misma sesión), los settings antiguos persisten.
- **Recomendación**: depender de `user.id` y resetear settings en logout.

### 7.4 [MEDIO] Sin i18n

- **Detalle**: textos hardcoded en español.
- **Recomendación**: si entra en el alcance, integrar `react-i18next` con catálogos `es/en`.

### 7.5 [BAJO] `react-masonry-css` con valores hardcoded

- **Detalle**: `totalColumns = 5` en `Header.tsx` (según análisis del frontend).
- **Recomendación**: extraer a constante de configuración.

### 7.6 [BAJO] Mensajes de error genéricos al usuario

- **Detalle**: muchos errores muestran “Error al…” sin pista. Los toast deberían distinguir 401, 403, 422.
- **Recomendación**: helper que mapee `error.code` → mensaje localizado.

---

## 8. Documentación y consistencia

### 8.1 [MEDIO] README desalineado con el código

- **Detalle**:
  - README muestra `DATABASE_URL` y `SERVER_URL`, el código usa `DB_*` separadas y `APP_URL`/`APP_URL_2`.
  - README muestra el árbol con `docs/api.md` y `docs/architecture.md`, pero esos archivos fueron eliminados (status `D` en git).
- **Recomendación**: regenerar README a partir de la nueva documentación (`docs/architecture.md`, `docs/documentation.md`, `docs/pending-tasks.md`).

### 8.2 [MEDIO] Sin sección de “Contribución” ni de “Seguridad”

- **Detalle**: el repo no documenta cómo reportar issues, cómo ejecutar la suite completa de checks, ni a quién avisar de vulnerabilidades.
- **Recomendación**: añadir `CONTRIBUTING.md` y `SECURITY.md`.

### 8.3 [BAJO] Comentarios en castellano e inglés mezclados

- **Detalle**: `index.ts` mezcla `// Importaciones existentes` con `// Apply rate limiting to all API routes`.
- **Recomendación**: elegir un idioma único para comentarios y nombres de identificadores (es habitual el inglés para identificadores y mixto para comentarios; convendría documentarlo).

---

## 9. Limpieza de código

### 9.1 [MEDIO] Coexistencia de `multerConfig.ts`, `multerConfigNotes.ts`, `multerConfigPFP.ts` y `middleware/upload.ts`

- **Detalle**: cuatro caminos para hacer lo mismo, con riesgo de drift y un vector inseguro en los legacy.
- **Recomendación**: unificar en `middleware/upload.ts` (que ya hace lo correcto con MIME→ext) y eliminar los otros tres.

### 9.2 [MEDIO] `pages/Notes.tsx` con múltiples responsabilidades

- **Detalle**: estado de notas + UI + layout + handlers + montaje del `NotesContext`.
- **Recomendación**: extraer la construcción del `NotesContext` a un provider real (`<NotesProvider>`) y dejar la página solo con layout.

### 9.3 [BAJO] Magic numbers (50 default, 100 max) en paginación

- **Ubicación**: `NoteCrudController.ts:77`.
- **Recomendación**: mover a `constants.ts`.

### 9.4 [BAJO] `Math.random()` para identificadores de archivo

- **Ubicación**: configs de multer.
- **Detalle**: aceptable porque se combina con timestamp; sin embargo, `crypto.randomBytes(8).toString('hex')` es más robusto y elimina colisiones improbables.
- **Recomendación**: usar `crypto`.

### 9.5 [BAJO] `console.error` residuales

- **Detalle**: confirmado en `multerConfig.ts:110`, `multerConfigNotes.ts:57`, `database.ts:17`.
- **Recomendación**: reemplazar por `logger.*` (relacionado con 3.8).

---

## 10. Resumen y priorización

### 10.1 Sprint 1 (1-2 semanas) — bloqueantes de seguridad/operativa

1. (1.1) Habilitar TLS en pool PostgreSQL.
2. (1.2) Validar `JWT_SECRET` y todas las env críticas al arrancar (`envSchema`).
3. (1.3) Configurar CORS también en producción con whitelist.
4. (1.4 + 9.1) Eliminar los `multerConfig.ts`, `multerConfigNotes.ts`, `multerConfigPFP.ts` y centralizar en `middleware/upload.ts`.
5. (1.5) Validar path en `deleteImage` con `pathHelpers.validateSafePath()`.
6. (1.6) Aplicar rate limit a `GET /api/password/validate-token/:token`.
7. (6.1) Crear pipeline GitHub Actions con lint + typecheck + tests + audit.

### 10.2 Sprint 2 (2-3 semanas) — robustez

1. (1.7, 1.8) Migrar `multer` a 2.x y resolver CVEs reportadas por `npm audit`.
2. (1.10) Redacción de campos sensibles en logs.
3. (1.12) `app.set('trust proxy', 1)` y verificar rate limits.
4. (3.1, 3.5, 3.6, 3.7) Corregir scheduler, adoptar `asyncHandler`, registrar shutdown hooks y cancelar intervalos.
5. (4.1, 4.2) Migración: añadir CASCADE e índice en `note_groups.user_id`.
6. (6.7, 6.8) Scripts npm de calidad + pre-commit con Husky/lint-staged.

### 10.3 Sprint 3 (3-4 semanas) — base de la plataforma

1. (2.1, 2.2) Tokens en cookies httpOnly + event bus de sesión.
2. (5.1, 5.2) Dockerfiles + abstracción de StorageProvider (S3 opcional).
3. (4.3) Adoptar `node-pg-migrate` y unificar el schema en una única fuente.
4. (6.2, 6.4) Cubrir dominios sin tests y añadir suite Playwright para flujos críticos.
5. (6.5, 6.6) Activar `strict: true` en backend; subir frontend a TypeScript 5.x.

### 10.4 Backlog (mejoras continuas)

- (3.10, 3.11) Helper de UPDATE parcial y transacciones.
- (4.4, 4.5, 4.6, 4.8) Saneado fino del schema (ENUMs, índices parciales, `end_date`, `statement_timeout`).
- (7.1–7.6) Mejoras de accesibilidad e i18n.
- (8.1–8.3) Limpieza de README y docs auxiliares.
- (5.3) Decidir sobre tessdata.

### 10.5 Matriz resumen

| Sev.     | Backend Sec. | Frontend Sec. | Bugs / Fiab. | DB | Ops | CI/Tests | UX | Doc. | Total |
| -------- | ------------ | ------------- | ------------ | -- | --- | -------- | -- | ---- | ----- |
| Crítico  | 6            | 0             | 0            | 0  | 0   | 1        | 0  | 0    | 7     |
| Alto     | 7            | 2             | 6            | 3  | 3   | 6        | 0  | 0    | 27    |
| Medio    | 5            | 3             | 5            | 5  | 2   | 4        | 4  | 2    | 30    |
| Bajo     | 1            | 1             | 0            | 2  | 1   | 1        | 2  | 1    | 9     |
| **TOTAL**| **19**       | **6**         | **11**       | **10** | **6** | **12**   | **6** | **3** | **73** |

### 10.6 Métricas de éxito sugeridas

- **Seguridad**: 0 vulnerabilidades High/Critical en `npm audit` (ambos paquetes), HSTS y CSP sin `'unsafe-inline'` ni `data:` en producción.
- **Tests**: cobertura backend ≥ 60 %, frontend ≥ 40 %, suite Playwright cubriendo los 5 flujos clave.
- **CI**: pipeline verde obligatorio para merges a `main`.
- **Observabilidad**: 100 % de logs centralizados sin `console.*`; redacción automática de secretos verificada por tests.
- **Operativa**: deploy reproducible vía `docker compose up` (incluyendo backend y frontend); imágenes durables en S3.

---

Este documento debe revisarse al cerrar cada sprint. Las referencias `archivo:línea` son a la HEAD analizada (`f3e3d47`) y deben verificarse si el código ha cambiado.
