# Arquitectura — Olympus Scribe

Documento técnico de la arquitectura del proyecto Olympus Scribe, un gestor de notas y recordatorios colaborativo desarrollado como Trabajo de Fin de Grado.

> Fecha del análisis: 2026-05-31
> Versión analizada: rama `rodrigo` (último commit `f3e3d47`).

---

## 1. Visión general

Olympus Scribe es una aplicación SPA cliente-servidor estructurada en tres procesos lógicos:

```
┌──────────────────┐     HTTPS/JSON      ┌──────────────────┐     TCP/SSL      ┌──────────────────┐
│  Frontend SPA    │ ──────────────────▶ │  Backend API     │ ───────────────▶ │  PostgreSQL 16   │
│  (React 18 +     │  Bearer JWT (Auth)  │  (Express + TS)  │   pg.Pool        │  (Docker / host) │
│   TypeScript)    │ ◀────────────────── │  Node.js ≥ 18    │ ◀─────────────── │                  │
└──────────────────┘                     └────────┬─────────┘                  └──────────────────┘
                                                  │
                                  Nodemailer SMTP │ (Gmail App Password)
                                                  ▼
                                         ┌──────────────────┐
                                         │  Servidor SMTP   │
                                         │  (Gmail)         │
                                         └──────────────────┘
```

- **Frontend** (`frontend/`): React 18 + TypeScript 4.9 + Tailwind CSS 4 + react-router-dom 7. SPA monolítica con renderizado en cliente, axios para HTTP y Context API para estado global.
- **Backend** (`backend/`): Express 4 + TypeScript 5.7. API REST stateful (vía JWT + refresh tokens en BD). Gestiona uploads en disco local, scheduling de emails (node-schedule) y limpieza periódica de tokens.
- **Base de datos**: PostgreSQL 16 con esquema relacional normalizado a 3NF. Se ejecuta vía `docker-compose` para desarrollo (sólo BD) o instancia gestionada en producción.
- **Email**: Gmail SMTP vía Nodemailer (app password). Plantillas EJS para recordatorios; HTML inline para reset de contraseña y contacto.

No hay servicio de objetos (S3 / MinIO): las imágenes se guardan en `backend/uploads/`. No hay caché distribuida (Redis). No hay broker de mensajería: el scheduling de emails se hace in-process con `node-schedule` y `setInterval`.

---

## 2. Estructura de directorios

```
TFG-gestor-notas-Rodrigo-Juanjo/
├── backend/
│   ├── src/
│   │   ├── config/              # logger (Winston), multer (3 variantes)
│   │   ├── controllers/         # Lógica de negocio agrupada por dominio
│   │   │   ├── note/            # NoteCrudController, NoteSharingController, NoteGroupController
│   │   │   └── usergroup/       # UserGroupCrudController, GroupMemberController, GroupNoteController
│   │   ├── errors/              # AppError + subclases (BadRequest, NotFound, ...)
│   │   ├── middleware/          # auth (JWT), validate (Zod), rateLimiter, upload, errorHandler
│   │   ├── models/              # Tipos TS y modelo Reminder
│   │   ├── routes/              # 8 routers Express
│   │   ├── services/            # emailService, emailSchedulerService
│   │   ├── utils/               # queryHelpers, pathHelpers, urlHelpers, cleanupTasks, emailTasks
│   │   ├── validation/schemas/  # Zod schemas por dominio
│   │   ├── __tests__/           # Jest + Supertest
│   │   ├── database.ts          # Pool de pg
│   │   └── index.ts             # Entrypoint Express
│   ├── migrations/              # 001_add_token_tables.sql
│   ├── templates/               # Plantillas EJS de email
│   ├── uploads/                 # Imágenes (gitignored, contiene .gitkeep)
│   ├── tessdata/ + *.traineddata# Modelos OCR (sin uso aparente en código)
│   ├── coverage/                # Reporte de Jest
│   ├── prepare-resources.js     # Crea uploads/, templates/ al arrancar
│   ├── start.sh + start-backend.js
│   ├── jest.config.js, tsconfig.json, .eslintrc.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/{Layout, Notes, Reminders, UserGroups, Auth}
│   │   ├── contexts/            # AuthContext, NotesContext, SettingsContext
│   │   ├── hooks/               # useNotes, useUserGroups, useSharedNotes, useUIEffects, ...
│   │   ├── pages/               # Home, Login, Notes, Trash, Reminders, Groups, Settings, ...
│   │   ├── services/            # api.ts (axios + JWT refresh), auth.ts, themeService
│   │   ├── styles/              # CSS por página
│   │   ├── types/               # Interfaces TS globales
│   │   ├── utils/               # exportHelpers (PDF/TXT), sanitize (DOMPurify)
│   │   ├── App.tsx, index.tsx
│   │   └── setupTests.ts
│   └── package.json (react-scripts)
├── docker/
│   └── README.md                     # (el schema vive en database.sql, montado por compose)
├── docs/                         # Esta carpeta
├── database.sql                  # Schema monolítico (alternativa a docker/init)
├── docker-compose.yml            # Solo levanta postgres:16-alpine
├── .env.docker.example
└── README.md
```

---

## 3. Backend — diseño en capas

### 3.1 Diagrama de capas

```
┌────────────────────────────────────────────────────────────────┐
│  HTTP Layer  (Express)                                         │
│  ─ helmet (CSP, headers)                                       │
│  ─ cors (solo en dev, FRONTEND_URL)                            │
│  ─ express.json()                                              │
│  ─ generalApiLimiter (100 req/15min, skip en dev y /uploads/)  │
│  ─ static: /note-images, /uploads, /uploads/group-note-images  │
└──────────────┬─────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────┐
│  Routes  (backend/src/routes/*)                                │
│  /api/auth, /api/notes, /api/groups, /api/user-groups,         │
│  /api/account, /api/reminders, /api/contact, /api/password     │
└──────────────┬─────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────┐
│  Middleware específico por endpoint                             │
│  ─ rateLimiter (login/register/passwordReset/contact)          │
│  ─ authenticateToken (JWT + blacklist en revoked_tokens)       │
│  ─ validate(schema)  → Zod                                     │
│  ─ upload (multer)   → disk storage                            │
└──────────────┬─────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────┐
│  Controllers  (backend/src/controllers/**)                     │
│  Acoplados a pg.Pool directamente — NO hay capa Repository     │
│  Devuelven `{ success, data | error }`                          │
└──────────────┬─────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────┐
│  Servicios  (backend/src/services/*)                           │
│  emailService (nodemailer + EJS)                               │
│  emailSchedulerService (orquesta Promise.allSettled)           │
└──────────────┬─────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────┐
│  Persistencia  (backend/src/database.ts)                       │
│  pg.Pool (sin SSL, sin tuning explícito)                       │
└──────────────┬─────────────────────────────────────────────────┘
               │
┌──────────────▼─────────────────────────────────────────────────┐
│  Cross-cutting                                                  │
│  ─ errors/AppError + subclases                                  │
│  ─ middleware/errorHandler (notFoundHandler + errorHandler)    │
│  ─ config/logger (Winston: console + file)                     │
│  ─ utils/cleanupTasks, utils/emailTasks                        │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Bootstrap (`backend/src/index.ts`)

Orden exacto de inicialización (líneas 24-154):

1. `dotenv.config()` carga variables de entorno.
2. `helmet(...)` aplica cabeceras de seguridad y una CSP restrictiva (`defaultSrc 'self'`, `scriptSrc 'self'`, `frameSrc 'none'`). `crossOriginResourcePolicy: cross-origin` para permitir servir imágenes desde otro origen.
3. Creación idempotente de directorios `uploads/`, `uploads/profile-images`, `uploads/note-images`, `uploads/group-note-images`.
4. Static serving: `/note-images`, `/uploads`, `/uploads/group-note-images`.
5. `cors(...)` se monta **solo si** `NODE_ENV !== 'production'`. En producción se asume que Nginx aplica la política CORS.
6. `express.json()` (sin límite de tamaño explícito; default 100 kB de body-parser sobra para JSON pero las imágenes van por `multer` separado).
7. `generalApiLimiter` para todas las rutas `/api`. Skip total en `NODE_ENV != 'production'` y skip de `/uploads/` en producción.
8. Error handler ad-hoc para errores de disco en `/uploads` (EACCES → 500, ENOENT → 404).
9. Registro de los 8 routers REST.
10. Middleware de logging `debug` solo en desarrollo.
11. `notFoundHandler` y `errorHandler` (este último debe ser el último middleware).
12. `cleanupExpiredTokens()` se ejecuta cada 24 horas vía `setInterval`.
13. `app.listen()` arranca el servidor y al callback se invocan `setupTrashCleanup()` y `setupEmailScheduler()`.

No hay handlers de `SIGINT` / `SIGTERM` para apagado limpio en el proceso principal (sí están en `start-backend.js`, pero solo cierran el proceso hijo).

### 3.3 Autenticación y autorización

- **Login/registro** (`controllers/auth.controller.ts`):
  - Hash de contraseña con `bcrypt` (10 rondas).
  - Tras login válido emite **access token** (`JWT_SECRET`, expira en 1 h, payload `{ id, email }`) y **refresh token** (expira en 7 d, payload `{ id, type: 'refresh' }` + persistencia en `refresh_tokens`).
- **Middleware** (`middleware/auth.ts`):
  - Extrae `Authorization: Bearer <token>`.
  - Verifica firma con `JWT_SECRET` (lanza si la variable falta — pero solo en runtime, no en startup).
  - Rechaza tokens con `type === 'refresh'` (no se permiten como access token).
  - Comprueba `revoked_tokens` en cada request.
- **Logout** (`controllers/auth.controller.ts`):
  - Inserta el access token en `revoked_tokens` con `expires_at` igual al `exp` del JWT.
  - Elimina el refresh token del usuario.
- **Refresh** (`POST /api/auth/refresh`): verifica el refresh token contra BD, emite nuevo access.
- **Roles en grupos**: `owner` / `admin` / `member` (VARCHAR sin ENUM). Comprobados con queries puntuales en cada controller (`WHERE group_id = $1 AND user_id = $2 AND role = 'owner'`).

### 3.4 Validación de entrada

- Todos los inputs JSON pasan por `middleware/validate.ts` que ejecuta un schema Zod de `validation/schemas/`.
- Los schemas validan tipos, longitudes y patrones (regex de password fuerte, hex color, email).
- `note.schema.ts` añade una capa anti-XSS: rechaza patrones `<script>`, `<iframe>`, `javascript:`, `on*=`, `<object>`, `<embed>` antes de almacenar el contenido. (Defensa en profundidad; la sanitización final ocurre en el frontend con DOMPurify al renderizar.)
- `loginSchema` deliberadamente NO exige password fuerte (compatibilidad con usuarios antiguos).

### 3.5 Manejo de errores

- `errors/AppError.ts` define una jerarquía con `statusCode`, `isOperational`, `code` opcional. Subclases: `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `ValidationError` (422), `TooManyRequestsError` (429), `InternalError` (500), `ServiceUnavailableError` (503), `DatabaseError`.
- `middleware/errorHandler.ts` centraliza la conversión a JSON. Mapea errores nativos:
  - `JsonWebTokenError` / `TokenExpiredError` → 401.
  - Códigos PG `23xxx` → 400/409.
  - Otros → 500 (mensaje genérico en producción, real en dev).
- Existe un helper `asyncHandler` para envolver controladores async, pero **no está adoptado en las rutas**: muchos controllers usan `try/catch` manual con `next(err)`.
- Formato uniforme de respuesta de error: `{ success: false, error: { message, code?, errors? } }`.

### 3.6 Rate limiting

| Limiter                       | Ventana | Máx | Aplicación                              |
| ----------------------------- | ------- | --- | --------------------------------------- |
| `loginLimiter`                | 15 min  | 5   | `POST /api/auth/login`                  |
| `registerLimiter`             | 1 h     | 3   | `POST /api/auth/register`               |
| `passwordResetLimiter`        | 15 min  | 3   | `POST /api/password/request-reset`      |
| `passwordResetConfirmLimiter` | 15 min  | 3   | `POST /api/password/reset`              |
| `contactLimiter`              | 1 h     | 5   | `POST /api/contact`                     |
| `generalApiLimiter`           | 15 min  | 100 | Todo `/api/*` (excepto `/uploads/`)     |
| `strictApiLimiter`            | 15 min  | 10  | Reservado, sin uso actualmente          |

Todos se saltan en `NODE_ENV != 'production'`. Trabajan por IP sin lectura de `X-Forwarded-For` configurable (`app.set('trust proxy', …)` no se invoca). El rate limit se ataría a la IP del proxy si la app corre detrás de Nginx.

### 3.7 Subida de archivos

Existen **dos sistemas de multer en paralelo**:

- **Legacy** (`backend/src/config/multerConfig.ts`, `multerConfigNotes.ts`, `multerConfigPFP.ts`): usa `path.extname(file.originalname)` para construir el nombre final. Si el cliente envía `originalname = "shell.php"` con `mimetype = "image/jpeg"`, el archivo se guarda con extensión `.php`. Solo es explotable si la carpeta `/uploads` es servida por un intérprete (Apache/Nginx + PHP-FPM). Express static no lo ejecuta.
- **Moderno** (`backend/src/middleware/upload.ts`): mapea MIME a extensión segura (`ALLOWED_MIME_TO_EXT`) y descarta la extensión del cliente. Esta es la implementación correcta.

Ambas conviven en el código. Los routers usan una u otra según el endpoint.

Límite de tamaño: 25 MB para imágenes. Tipos aceptados: `image/jpeg`, `image/png`, `image/gif`, `image/webp`.

### 3.8 Servicios

- **`emailService`** (`services/emailService.ts`):
  - `nodemailer.createTransport({ service: 'gmail', auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD } })`.
  - Funciones: `sendReminderEmail()` (plantilla EJS `templates/emails/reminder.ejs`), `sendContactEmail()` (sanitiza CRLF), `sendPasswordResetEmail()` (HTML inline, URL vía `urlHelpers.getPasswordResetUrl`).
- **`emailSchedulerService`** (`services/emailSchedulerService.ts`):
  - Consulta recordatorios pendientes vía `Reminder.findRemindersForEmailNotification()`.
  - Despacha emails con `Promise.allSettled`.
  - Si un envío falla, se loguea individualmente.
- **`utils/cleanupTasks.ts`**: `setupTrashCleanup()` programa con `node-schedule` (`'0 3 * * *'`, todos los días a las 3 AM UTC) un `DELETE FROM notes WHERE is_deleted = TRUE AND deleted_at < NOW() - INTERVAL '30 days'`.
- **`utils/emailTasks.ts`**: `setupEmailScheduler()` arranca el ciclo de envío de recordatorios.
- **`cleanupExpiredTokens()`** en `index.ts:129`: elimina filas caducadas de `password_reset_tokens` cada 24 h vía `setInterval`.

### 3.9 Logging

`config/logger.ts` (Winston):

- Niveles: `debug`, `info`, `warn`, `error`.
- Formato:
  - Desarrollo: consola coloreada y legible.
  - Producción: JSON estructurado (compatible con agregadores tipo Loki/Elastic).
- Transportes:
  - Consola siempre.
  - Ficheros `error.log` y `combined.log` (5 MB, máx. 5 archivos) en producción.
- Helpers: `log.auth()`, `log.security()`, `log.db()`, `log.failure()`.
- No hay redacción automática de campos sensibles (passwords/tokens pueden aparecer en stack traces si los errores los contienen).

### 3.10 Persistencia

- Cliente: `pg.Pool` configurado con variables `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT` (sin opción `ssl`, sin tuning de `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`).
- No hay capa de repositorio: cada controller llama a `pool.query(...)` directamente con SQL parametrizado.
- Sin uso explícito de transacciones excepto en `GroupMemberController` (operaciones que mueven roles/owner). Operaciones de varios pasos en notas (e.g., compartir + actualizar permisos) van sin BEGIN/COMMIT.

---

## 4. Frontend — diseño en capas

### 4.1 Árbol de providers

```
index.tsx
└── React.StrictMode
    └── App.tsx
        ├── AuthProvider          (contexts/AuthContext)
        ├── SettingsProvider      (contexts/SettingsContext)
        └── BrowserRouter
            └── ThemeLoader        (carga tema del servidor)
                ├── Toaster        (react-hot-toast)
                └── Routes
                    ├── Públicas:  /, /login, /forgot-password, /reset-password/:token
                    └── Privadas:  /notes, /trash, /reminders, /settings, /groups
                                   (envueltas en <PrivateRoute>)
```

`NotesContext` no se monta a nivel de App; se instancia en `pages/Notes.tsx`, que construye el valor a partir de los hooks `useNotes`, `useGroups`, `useSharedNotes`. Esto crea un acoplamiento entre `NoteCard` y el árbol específico de la página de notas, pero evita re-renders de toda la app al cambiar el estado de las notas.

### 4.2 Routing

- `react-router-dom` v7 con `BrowserRouter`.
- Todas las páginas se cargan con `React.lazy()` y se envuelven en `<Suspense fallback={<PageLoader/>}>`.
- `PrivateRoute` comprueba `authService.isAuthenticated()` (basado en presencia del token en localStorage). No valida la expiración del JWT en el cliente; delega al primer 401 del backend.
- Logout post-401: el interceptor de axios (`services/api.ts`) llama a `window.location.href = '/login'` en lugar de `useNavigate`. Pierde el estado de React pero garantiza un arranque limpio.

### 4.3 Estado global

| Contexto          | Persistencia    | Responsabilidad                                    |
| ----------------- | --------------- | -------------------------------------------------- |
| `AuthContext`     | `localStorage`  | `user`, `token`, `refreshToken`, `logout()`        |
| `SettingsContext` | servidor + LS  | tema, sort por defecto, página inicial, confirmDel |
| `NotesContext`   | runtime         | notas activas, grupo seleccionado, handlers UI    |

Estado local en cada página/componente con `useState`/`useReducer`. No se usan librerías externas (Redux/Zustand/Jotai).

### 4.4 Capa de servicios

`services/api.ts` expone una instancia única de axios con:

- `baseURL = process.env.REACT_APP_API_URL`.
- **Request interceptor**: añade `Authorization: Bearer <token>` si existe en localStorage.
- **Response interceptor**: ante un 401 intenta refrescar con `refreshToken`. Si tiene éxito, reintenta la petición original. Mientras se refresca, encola las peticiones (`refreshSubscribers`) para no disparar múltiples refresh en paralelo. Si el refresh falla, limpia localStorage y redirige a `/login`.
- Funciones agrupadas por dominio: `authService`, `accountService`, `notesService`, `sharedNotesService`, `groupsService`, `userGroupsService`, `remindersService`, `contactService`, `passwordService`.

### 4.5 Estilos y temas

- **Tailwind CSS 4** configurado vía `@tailwindcss/postcss`, pero la mayoría del código sigue usando archivos `.css` por página (`styles/notes.css`, `styles/reminders.css`, etc.).
- `themeService` aplica el tema (`light` / `dark`) mediante variables CSS sobre `:root`.
- El tema se carga al arrancar desde localStorage y se sincroniza con `GET /account/settings` cuando hay sesión.

### 4.6 Accesibilidad y UX

- Modales (`GroupModal`, `ShareNote`, `ReminderForm`) usan `role="dialog"`, `aria-modal`, focus trap y cierre por `Escape`.
- Hay regiones `aria-live="polite"` en `NotesContent` para feedback de guardado.
- `react-hot-toast` provee feedback de éxito/error.
- Skeleton loader (`PageLoader`) en transiciones de rutas.
- Soporte de tema oscuro completo.
- No hay i18n: todos los textos están hardcoded en español.

### 4.7 Sanitización

- `utils/sanitize.ts` envuelve DOMPurify con `sanitizeHTML`, `sanitizePlainText`, `sanitizeArray`.
- Se aplica al exportar a PDF/TXT (`utils/exportHelpers.ts`).
- El contenido de las notas se renderiza en `<textarea>` (texto plano), por lo que no hay vector XSS en el render normal.

---

## 5. Modelo de datos

PostgreSQL 16, esquema normalizado a 3NF. Existen dos copias del schema:

- `database.sql` (raíz): **única fuente del esquema**. Lo usa tanto el setup manual (`psql -f database.sql`) como Docker (docker-compose lo monta en `/docker-entrypoint-initdb.d` y se ejecuta en la primera inicialización del contenedor).
- `backend/migrations/`: cambios incrementales versionados (001, 002, 003, ...) aplicados sobre el esquema base.

Ambos deben mantenerse sincronizados manualmente. La migración `backend/migrations/001_add_token_tables.sql` ya está incluida en ambos.

### 5.1 Inventario de tablas

**Dominio: Usuarios y autenticación**

| Tabla                   | PK   | Notas clave                                                            |
| ----------------------- | ---- | ---------------------------------------------------------------------- |
| `users`                 | UUID | `email UNIQUE`, `password` (bcrypt), `profile_image`                   |
| `settings`              | UUID | FK `user_id` CASCADE; tema, idioma, sort por defecto, notificaciones   |
| `password_reset_tokens` | UUID | `token`, `expires_at`, `used`; índices en `user_id`, `token`, `exp.`  |
| `refresh_tokens`        | UUID | `token UNIQUE`, `expires_at`; índices en `user_id`, `token`, `exp.`   |
| `revoked_tokens`        | UUID | `token UNIQUE`, `reason`, `expires_at`; blacklist de access tokens     |

**Dominio: Notas personales**

| Tabla              | PK     | Notas clave                                                                       |
| ------------------ | ------ | --------------------------------------------------------------------------------- |
| `notes`            | UUID   | `images TEXT[]` (índice GIN), soft delete (`is_deleted`, `deleted_at`)            |
| `note_groups`      | SERIAL | FK `user_id` **sin CASCADE** (inconsistencia), sin índice en `user_id`           |
| `note_group_items` | (g,n)  | Tabla puente notas↔grupos                                                         |
| `shared_notes`     | UUID   | UNIQUE(`note_id`, `shared_with_id`), `can_edit`, `include_images`                |

**Dominio: Recordatorios**

| Tabla                  | PK       | Notas clave                                              |
| ---------------------- | -------- | -------------------------------------------------------- |
| `reminders`            | UUID     | `date_time`, `has_time`, `send_email`, FK a status       |
| `reminder_recurrence`  | UUID     | `frequency` (VARCHAR sin ENUM), `interval_value`, `end_date` |
| `reminder_status`      | SMALLINT | Lookup: 1=pendiente, 2=completado, 3=cancelado           |

**Dominio: Grupos de usuarios (colaborativos)**

| Tabla            | PK   | Notas clave                                                                  |
| ---------------- | ---- | ---------------------------------------------------------------------------- |
| `user_groups`    | UUID | `owner_id` FK CASCADE                                                        |
| `group_members`  | UUID | UNIQUE(`group_id`, `user_id`), `role` VARCHAR sin CHECK (owner/admin/member) |
| `group_notes`    | UUID | FK a `user_groups` y `users`, soporta imágenes                               |

### 5.2 Diagrama de relaciones

```
                       ┌───────────────┐
                       │     users     │
                       └───────┬───────┘
                               │
       ┌───────────┬───────────┼────────────┬─────────────────┐
       │           │           │            │                 │
       ▼           ▼           ▼            ▼                 ▼
  ┌─────────┐ ┌────────┐ ┌─────────┐  ┌──────────────┐  ┌─────────────┐
  │settings │ │ notes  │ │reminders│  │ user_groups  │  │ refresh_/   │
  └─────────┘ └───┬────┘ └────┬────┘  └──────┬───────┘  │ revoked_/   │
                  │           │              │           │ password_   │
            ┌─────┴─────┐     ▼              ├───────────┤ reset_tokens│
            ▼           ▼  reminder_         │           └─────────────┘
       shared_notes  note_   recurrence      ▼
                     group_              group_members
                     items                group_notes
                       │
                       ▼
                 note_groups
```

### 5.3 Vistas

- `v_shared_notes`: JOIN entre `shared_notes`, `notes` y `users` (owner y shared_with).
- `v_group_notes`: JOIN entre `group_notes`, `users` y `user_groups`.
- `v_reminders`: JOIN entre `reminders`, `reminder_status` y `reminder_recurrence`.

### 5.4 Triggers y funciones

- `update_updated_at_column()` (PL/pgSQL) actualiza la columna `updated_at` en cada UPDATE. Aplicada a: `users`, `settings`, `notes`, `user_groups`, `group_notes`, `reminders`, `reminder_recurrence`, `shared_notes`.
- `cleanup_expired_tokens()` definida en la migración 001, pero NO programada (sin `pg_cron`); se invoca manualmente o desde `cleanupExpiredTokens()` del backend.

---

## 6. Seguridad transversal

Política y estado actual de los controles principales (detalle de incidencias en `pending-tasks.md`):

| Vector             | Control                                          | Estado actual                                                       |
| ------------------ | ------------------------------------------------ | ------------------------------------------------------------------- |
| Inyección SQL      | Queries parametrizadas con `pg`                  | Correcto en todos los controllers analizados                        |
| XSS                | Zod blacklist + DOMPurify en cliente             | Sólo se filtra HTML al guardar notas; resto delega en `<textarea>` |
| CSRF               | (no implementado)                                | Confía en JWT en header; sin tokens CSRF                            |
| JWT                | Firma + blacklist + refresh                      | Sin validación de `JWT_SECRET` en startup                           |
| Brute force        | `loginLimiter` (5/15min)                         | Saltado en dev; sin protección en `/password/validate-token`        |
| File upload        | Filtro MIME + límite 25 MB                       | Extensión tomada de `originalname` en 2 de 3 multer configs        |
| Path traversal     | `pathHelpers.validateSafePath`                   | Existe pero no se usa en `deleteImage` legacy                       |
| Email injection    | Sanitización CRLF de inputs                      | Implementada en `sendContactEmail`                                  |
| TLS BD             | (no configurado)                                 | Pool sin `ssl: true`                                                |
| Helmet / CSP       | CSP restrictiva                                  | Permite `data:` y `'unsafe-inline'` en styles                       |
| CORS               | Sólo configurado en desarrollo                   | En producción se delega a Nginx                                     |
| Password storage   | bcrypt 10 rondas                                 | Correcto                                                            |
| Password policy    | 8+ chars, mayús, minús, número (Zod)             | Aplicada en registro y cambio; relajada en login (compat. legacy)   |
| Recovery tokens    | 80 hex chars, TTL 1 h, un solo uso               | Correcto, salvo rate limit en `validate-token`                      |
| Session expiration | Access 1 h, refresh 7 d                          | Refresh no rotativo (se reutiliza hasta TTL)                        |
| Logging            | Winston JSON en prod                             | Sin redacción automática de secretos                                |

---

## 7. Infraestructura y despliegue

### 7.1 Docker Compose

`docker-compose.yml` levanta **solo PostgreSQL**:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: olympus_scribe_db
    restart: unless-stopped
    environment:
      POSTGRES_USER:     ${DB_USER:-olympus}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-olympus_dev_password}
      POSTGRES_DB:       ${DB_NAME:-olympus_scribe}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-olympus} -d ${DB_NAME:-olympus_scribe}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

No hay servicios `backend` ni `frontend` en `docker-compose.yml`. No hay Dockerfile para la app.

### 7.2 Arranque del backend

- `start.sh` (shell, sólo Unix) → invoca `prepare-resources.js` y luego `start-backend.js`.
- `prepare-resources.js`: crea las carpetas de `uploads/` y `templates/` si faltan, y genera `templates/emails/reminder.ejs` con HTML por defecto.
- `start-backend.js`: localiza `ts-node` (local o global), ejecuta `src/index.ts` con `--transpile-only`, captura `SIGINT`/`SIGTERM`, reinicia el proceso a los 5 s si finaliza con error (preparado para PM2).
- En desarrollo se recomienda `npm run dev` (nodemon).

### 7.3 Frontend

- Build con `react-scripts build` → estáticos en `frontend/build/`.
- Servido por cualquier CDN/Nginx; ningún SSR.
- Requiere `REACT_APP_API_URL` apuntando al backend en tiempo de build.

### 7.4 Almacenamiento de imágenes

- Volumen local `backend/uploads/` con subcarpetas `profile-images/`, `note-images/`, `group-note-images/`.
- No se monta como volumen Docker en el `docker-compose.yml` actual (el contenedor de app no existe).
- No hay backend de objetos (S3/MinIO). Esto bloquea cualquier despliegue horizontal del backend.

---

## 8. Decisiones de diseño y trade-offs

1. **Sin ORM**: queries SQL directas con `pg`. Ventajas: simplicidad, sin overhead, control fino sobre rendimiento. Desventajas: SQL repetido entre controllers, sin migraciones versionadas reales, riesgo de derivar a queries N+1.
2. **JWT + refresh con blacklist en BD**: combina lo bueno de JWT (stateless en validación) con la posibilidad de revocar tokens. Coste: una consulta extra a `revoked_tokens` por cada request autenticado.
3. **Refresh tokens no rotativos**: simplifica el flujo pero amplía la ventana de uso si un refresh token se filtra. Buena práctica sería rotarlos en cada uso.
4. **CORS solo en desarrollo**: depende totalmente de la configuración de Nginx en producción. Si el deploy se mueve a un nuevo entorno, se introduce un riesgo silencioso.
5. **Imágenes en disco local**: simple para un TFG, pero impide escalado horizontal y supone riesgo de pérdida en contenedores efímeros.
6. ~~**Doble esquema SQL**~~ (RESUELTO): `database.sql` es ahora la única fuente, montada por docker-compose; ya no hay duplicado que sincronizar.
7. **Sin framework de migraciones**: hay migraciones `.sql` versionadas en `backend/migrations/` (001-003) pero se aplican a mano; no hay una herramienta (Knex, Prisma, node-pg-migrate) que registre qué se aplicó. Pendiente como mejora futura.
8. **`NotesContext` montado dentro de la página**: evita re-renders globales pero introduce un patrón inusual (consumer del contexto pero provider local).
9. **Sin librería de estado global**: para una app con este volumen es razonable; los `Context`s y hooks son suficientes.
10. **`window.location.href` para logout post-401**: forzado por la ubicación de `api.ts` fuera de un componente React. Podría sustituirse por un event emitter consumido por un componente que llame a `useNavigate`.

---

## 9. Configuración y variables de entorno

### 9.1 Backend (`backend/.env`, ejemplo en `backend/.env.example`)

| Variable             | Uso                                                          |
| -------------------- | ------------------------------------------------------------ |
| `PORT`               | Puerto HTTP (default 3001)                                   |
| `NODE_ENV`           | `development` / `production` (controla CORS, rate limit, logs) |
| `DB_USER`            | Usuario PostgreSQL                                            |
| `DB_HOST`            | Host PostgreSQL                                               |
| `DB_NAME`            | Nombre de BD                                                  |
| `DB_PASSWORD`        | Password PostgreSQL                                           |
| `DB_PORT`            | Puerto PostgreSQL (5432)                                      |
| `JWT_SECRET`         | Secreto HMAC para firmar tokens                               |
| `FRONTEND_URL`       | Origen permitido por CORS en desarrollo                       |
| `EMAIL_USER`         | Cuenta Gmail emisora                                          |
| `EMAIL_APP_PASSWORD` | App password de Gmail                                         |
| `APP_URL` / `APP_URL_2` | URLs base para construir links de email                   |
| `UPLOAD_DIR`         | Directorio de uploads (default `uploads`)                     |
| `MAX_FILE_SIZE`      | Límite en bytes (no aplicado en multerConfig actual)          |
| `LOG_LEVEL`          | Nivel Winston                                                 |

> El README menciona `DATABASE_URL` y `SERVER_URL`, pero el código real usa variables separadas (`DB_USER/DB_HOST/...`) y `APP_URL`. Inconsistencia documentada en `pending-tasks.md`.

### 9.2 Frontend (`frontend/.env`)

| Variable            | Uso                                  |
| ------------------- | ------------------------------------ |
| `REACT_APP_API_URL` | URL base de la API (e.g. `…/api`)   |

### 9.3 Docker (`.env.docker`, ejemplo en `.env.docker.example`)

| Variable      | Uso                          |
| ------------- | ---------------------------- |
| `DB_USER`     | Usuario para `postgres` |
| `DB_PASSWORD` | Password para `postgres`     |
| `DB_NAME`     | Nombre de BD                 |
| `DB_PORT`     | Puerto expuesto              |

Los `.env` reales **no están versionados** (verificado con `git ls-files`). Solo se versionan los `.env.example`. Conviene mantenerlo así y documentar la rotación de secretos.

---

## 10. Tareas programadas

| Tarea                       | Mecanismo                | Frecuencia            |
| --------------------------- | ------------------------ | --------------------- |
| Limpieza de papelera (>30 d) | `node-schedule` cron     | `0 3 * * *` (3 AM)    |
| Programación de emails      | `setupEmailScheduler`    | A definir en `emailTasks` (cada hora típicamente) |
| Limpieza de tokens reset    | `setInterval` 24 h       | Cada 24 h             |
| Limpieza de access tokens revocados | startup de la app | Una vez al arrancar (vía función SQL) |

---

## 11. Resumen ejecutivo

Olympus Scribe es una aplicación bien estructurada para el ámbito de un TFG: separación clara de capas en el backend, contextos del frontend bien delimitados, validación Zod sistemática, autenticación con refresh + blacklist, y un esquema relacional cuidado con índices, constraints y triggers de auditoría.

Los puntos donde la arquitectura tiene **deuda significativa** son:

- **Configuración de producción**: CORS, SSL a BD y validación de `JWT_SECRET` quedan implícitos en la confianza con Nginx u operador. Conviene cerrarlos en el código.
- **Coexistencia de dos configuraciones de multer** (legacy vs moderna): la legacy reintroduce un vector de upload con extensión controlada por el cliente.
- **Almacenamiento de imágenes** en disco local impide escalar el backend.
- **Migraciones no versionadas**: cambios al schema requieren editar dos archivos manualmente.
- **Cobertura de tests** baja (12,4 % backend; sin reporte frontend) y sin pipeline CI/CD.

Todos los hallazgos detallados se encuentran clasificados por severidad en [`docs/pending-tasks.md`](./pending-tasks.md). La guía funcional y de API por dominio se encuentra en [`docs/documentation.md`](./documentation.md).
