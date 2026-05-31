# Documentación funcional y de referencia — Olympus Scribe

Esta documentación describe cómo se usa la aplicación de extremo a extremo: configuración, funcionalidades, contratos de la API REST por dominio y referencia del frontend. Para el diseño técnico y diagramas de capas, ver [`architecture.md`](./architecture.md). Para incidencias y deuda técnica, ver [`pending-tasks.md`](./pending-tasks.md).

> Fecha del análisis: 2026-05-31
> Versión analizada: rama `rodrigo` (`f3e3d47`).

---

## Índice

1. [Puesta en marcha local](#1-puesta-en-marcha-local)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Modelo conceptual de la aplicación](#3-modelo-conceptual-de-la-aplicación)
4. [Flujos de uso end-to-end](#4-flujos-de-uso-end-to-end)
5. [Referencia de la API REST](#5-referencia-de-la-api-rest)
6. [Referencia del frontend](#6-referencia-del-frontend)
7. [Pruebas](#7-pruebas)
8. [Scripts disponibles](#8-scripts-disponibles)
9. [Despliegue](#9-despliegue)

---

## 1. Puesta en marcha local

### 1.1 Requisitos previos

- Node.js ≥ 18 (LTS recomendado).
- npm ≥ 9.
- PostgreSQL ≥ 14 (16 en producción Docker) accesible local o remoto.
- Cuenta de Gmail con **app password** habilitada (para envío de emails).

### 1.2 Pasos

```bash
# 1. Clonar el repositorio
git clone <url>
cd TFG-gestor-notas-Rodrigo-Juanjo

# 2. Instalar dependencias del backend
cd backend
npm install
cp .env.example .env   # rellenar valores (ver §2)

# 3. Levantar PostgreSQL (opción A: Docker)
cd ..
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d

# Alternativa (opción B: PostgreSQL ya instalado)
psql -U <usuario> -d <bd> -f database.sql

# 4. Instalar dependencias del frontend
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:3001/api" > .env

# 5. Ejecutar en dos terminales
# Terminal 1 (backend)
cd backend && npm run dev    # http://localhost:3001
# Terminal 2 (frontend)
cd frontend && npm start     # http://localhost:3000
```

El primer arranque del backend ejecuta `prepare-resources.js` y crea las carpetas de uploads y plantillas de email.

### 1.3 Inicialización de la BD por Docker

Cuando se levanta el contenedor por primera vez, PostgreSQL ejecuta automáticamente todos los scripts en `docker/postgres/init/`. Actualmente sólo hay uno: `01_schema.sql`, que crea todas las tablas, vistas, índices, triggers y datos del lookup `reminder_status`.

> Si necesitas reiniciar la BD desde cero: `docker compose down -v` borra el volumen `postgres_data`.

---

## 2. Variables de entorno

### 2.1 Backend (`backend/.env`)

| Variable             | Tipo    | Default     | Descripción                                                          |
| -------------------- | ------- | ----------- | -------------------------------------------------------------------- |
| `PORT`               | int     | 3001        | Puerto HTTP del servidor Express                                      |
| `NODE_ENV`           | string  | development | Controla CORS, rate limit, formato de logs                            |
| `DB_HOST`            | string  | —           | Host de PostgreSQL                                                    |
| `DB_PORT`            | int     | 5432        | Puerto de PostgreSQL                                                  |
| `DB_USER`            | string  | —           | Usuario PostgreSQL                                                    |
| `DB_PASSWORD`        | string  | —           | Password PostgreSQL                                                   |
| `DB_NAME`            | string  | —           | Base de datos                                                         |
| `JWT_SECRET`         | string  | —           | Secreto HMAC para firmar JWT (≥ 32 caracteres aleatorios)             |
| `FRONTEND_URL`       | string  | http://localhost:3000 | Origen autorizado por CORS en desarrollo                |
| `APP_URL`            | string  | —           | URL pública del frontend (usada en emails y links)                   |
| `APP_URL_2`          | string  | —           | URL alternativa (p. ej., dominio de prueba)                          |
| `EMAIL_USER`         | string  | —           | Cuenta Gmail emisora                                                  |
| `EMAIL_APP_PASSWORD` | string  | —           | App password de Gmail                                                 |
| `UPLOAD_DIR`         | string  | uploads     | Subdirectorio para uploads (relativo a `backend/`)                   |
| `MAX_FILE_SIZE`      | int     | 5 MB        | Límite de tamaño por archivo (informativo; multer usa 25 MB)         |
| `LOG_LEVEL`          | string  | info        | `debug`/`info`/`warn`/`error`                                         |
| `DEBUG`              | bool    | false       | Logging extendido                                                     |

### 2.2 Frontend (`frontend/.env`)

| Variable            | Default                       | Descripción                                  |
| ------------------- | ----------------------------- | -------------------------------------------- |
| `REACT_APP_API_URL` | http://localhost:3001/api     | URL base de la API; se incrusta en el build |

> Solo las variables que empiezan por `REACT_APP_` se exponen al bundle.

### 2.3 Docker (`.env.docker`)

| Variable      | Default                | Descripción                  |
| ------------- | ---------------------- | ---------------------------- |
| `DB_USER`     | olympus                | Usuario del contenedor       |
| `DB_PASSWORD` | olympus_dev_password   | Password del contenedor      |
| `DB_NAME`     | olympus_scribe         | Nombre de la base de datos   |
| `DB_PORT`     | 5432                   | Puerto expuesto al host      |

---

## 3. Modelo conceptual de la aplicación

### 3.1 Entidades principales

- **Usuario**: cuenta personal, con perfil, foto, ajustes y credenciales.
- **Nota personal**: pertenece a un usuario; admite título, contenido enriquecido (texto plano + listas), color, hasta 10 imágenes adjuntas, fijado (pin), marcado y eliminación lógica con papelera (TTL 30 días).
- **Grupo de notas personal**: carpeta propia para organizar notas; no tiene miembros, sólo agrupación visual.
- **Nota compartida**: una nota personal compartida con otro usuario, con flag `can_edit` y `include_images`.
- **Grupo de usuarios**: espacio colaborativo con miembros (`owner`/`admin`/`member`) y notas propias de grupo.
- **Nota de grupo**: nota visible para todos los miembros del grupo; pueden tener autor distinto.
- **Recordatorio**: evento personal con fecha/hora, estado (pendiente/completado/cancelado), envío opcional por email y recurrencia (frecuencia + intervalo + fecha fin).
- **Token de recuperación**: token de un solo uso para reset de contraseña (TTL 1 h).
- **Tokens de sesión**: access JWT (1 h) + refresh JWT (7 d) persistido en BD; blacklist en `revoked_tokens`.

### 3.2 Roles dentro de un grupo de usuarios

| Rol      | Crear/editar/borrar notas | Gestionar miembros        | Eliminar el grupo | Transferir propiedad |
| -------- | ------------------------- | ------------------------- | ----------------- | -------------------- |
| `owner`  | Sí                        | Sí (también owner)       | Sí                | Sí                   |
| `admin`  | Sí                        | Sí (no a otros admins)    | No                | No                   |
| `member` | Sí (solo sus notas)       | No                        | No                | No                   |

El owner es único y obligatorio. Para salir del grupo siendo owner es necesario transferir la propiedad primero.

---

## 4. Flujos de uso end-to-end

### 4.1 Registro y primer login

1. Usuario rellena el formulario en `/login` (componente `Login.tsx`).
2. El frontend valida fortaleza de contraseña con `PasswordStrengthIndicator`.
3. `POST /api/auth/register` crea el usuario (Zod valida formato, bcrypt hashea password).
4. `POST /api/auth/login` devuelve `{ accessToken, refreshToken, user }`.
5. `AuthContext` persiste tokens en `localStorage` y redirige a `/notes`.

### 4.2 Recuperación de contraseña

1. Usuario pulsa “¿Has olvidado tu contraseña?” en `/login` → navega a `/forgot-password`.
2. `POST /api/password/request-reset` con el email. Backend genera un token aleatorio de 40 bytes hex, lo guarda en `password_reset_tokens` (TTL 1 h) y envía email con un link `${APP_URL}/reset-password/<token>`.
3. Usuario abre el link → `GET /api/password/validate-token/:token` confirma vigencia.
4. Usuario introduce nueva contraseña → `POST /api/password/reset` con `{ token, newPassword }`. Backend actualiza el hash y marca el token como `used = true`.

### 4.3 Creación y compartición de una nota

1. Usuario crea nota en `/notes` (`CreateNoteForm` → `POST /api/notes`).
2. (Opcional) Subir imágenes vía `POST /api/notes/upload-image` (multer). El controller devuelve la URL relativa que el usuario incluye en el array `images` de la nota.
3. Compartir: `POST /api/notes/share` con `{ noteId, sharedWithId, canEdit, includeImages }`. El destinatario ve la nota en la pestaña “Notas compartidas”.
4. Modificar permisos: `PUT /api/notes/:id/share-permissions`.
5. El destinatario edita (si `can_edit = true`) con `PUT /api/notes/shared-notes/:id`.

### 4.4 Trabajo en grupo colaborativo

1. Owner crea el grupo en `/groups` (`POST /api/user-groups`).
2. Invita a usuarios por nombre (`POST /api/user-groups/:id/members`) o por email (`POST /api/user-groups/:id/invite`, envía email con link).
3. Los miembros crean notas con `POST /api/user-groups/:id/notes`.
4. Admin/owner cambian roles con `PUT /api/user-groups/:id/members/:userId/role`.
5. Para abandonar el grupo: `POST /api/user-groups/:id/leave`. Si eres owner, debes hacer primero `POST /api/user-groups/:id/transfer-ownership`.

### 4.5 Recordatorios con notificación por email

1. Usuario crea recordatorio en `/reminders` con `POST /api/reminders` (incluye `send_email: true` y `date_time`).
2. `setupEmailScheduler()` consulta periódicamente recordatorios pendientes próximos.
3. Envío con `Nodemailer` + plantilla `templates/emails/reminder.ejs`.
4. El estado se mueve a “completado” cuando el usuario lo confirma (`PATCH /api/reminders/:id/status`).

### 4.6 Papelera

1. `DELETE /api/notes/:id` aplica soft delete (marca `is_deleted = true`, fija `deleted_at`).
2. Listado: `GET /api/notes/trash`.
3. Restaurar: `POST /api/notes/trash/:id/restore`.
4. Vaciar manualmente: `DELETE /api/notes/trash/empty`.
5. Limpieza automática: `setupTrashCleanup` (cron `0 3 * * *`) borra notas con `is_deleted = true` y `deleted_at < NOW() - 30 days`.

---

## 5. Referencia de la API REST

Prefijo común: `/api`. Todas las respuestas tienen forma `{ success: boolean, data?: T, error?: { message, code?, errors? } }`. Las cabeceras esperan `Authorization: Bearer <accessToken>` salvo donde se indique.

### 5.1 Autenticación (`/api/auth`)

| Método | Ruta            | Middleware                                | Body                                  | Descripción                                    |
| ------ | --------------- | ----------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| POST   | `/register`     | `registerLimiter`, `validate(registerSchema)` | `{ email, username, password }`       | Crea usuario; password ≥ 8 con may/min/núm    |
| POST   | `/login`        | `loginLimiter`, `validate(loginSchema)`   | `{ email, password }`                 | Devuelve `accessToken`, `refreshToken`, `user` |
| POST   | `/refresh`      | —                                         | `{ refreshToken }`                    | Devuelve un nuevo `accessToken`                |
| POST   | `/logout`       | `authenticateToken`                       | `{ refreshToken? }`                   | Revoca access token y elimina el refresh      |

### 5.2 Recuperación de contraseña (`/api/password`)

| Método | Ruta                       | Middleware                                                          | Body                          | Descripción                              |
| ------ | -------------------------- | ------------------------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| POST   | `/request-reset`           | `passwordResetLimiter`, `validate(requestResetSchema)`              | `{ email }`                   | Genera token y envía email               |
| GET    | `/validate-token/:token`   | —                                                                   | —                             | Comprueba si el token sigue siendo válido |
| POST   | `/reset`                   | `passwordResetConfirmLimiter`, `validate(resetPasswordSchema)`      | `{ token, newPassword }`      | Establece nueva contraseña               |

### 5.3 Cuenta (`/api/account`)

Todos los endpoints requieren `authenticateToken`.

| Método | Ruta                     | Middleware adicional       | Body                                                | Descripción                                       |
| ------ | ------------------------ | -------------------------- | --------------------------------------------------- | ------------------------------------------------- |
| GET    | `/profile`               | —                          | —                                                   | Devuelve `{ id, email, username, profile_image }` |
| PUT    | `/update`                | `validate(updateUserSchema)` | `{ username?, email?, newPassword?, currentPassword? }` | Actualiza datos personales (currentPassword requerido si cambia password) |
| DELETE | `/delete`                | —                          | `{ password }`                                      | Elimina la cuenta tras confirmar password         |
| GET    | `/settings`              | —                          | —                                                   | Preferencias (tema, idioma, sort, notificaciones) |
| PUT    | `/settings`              | —                          | `{ theme?, language?, defaultNoteSort?, ... }`     | Actualiza preferencias                            |
| POST   | `/upload-profile-image`  | `upload (multer)`          | multipart `image`                                   | Sube foto de perfil (límite 25 MB)                |

### 5.4 Notas — CRUD (`/api/notes`)

Todos los endpoints requieren `authenticateToken`.

| Método | Ruta                            | Middleware adicional                            | Body / Query                                          | Descripción                                       |
| ------ | ------------------------------- | ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| POST   | `/`                             | `validate(createNoteSchema)`                    | `{ title, content?, color?, images? }`                | Crea nota                                          |
| GET    | `/`                             | —                                               | `?page&limit&sortBy&sortDir&paginate`                 | Lista notas activas con paginación                |
| PUT    | `/:id`                          | `validate(updateNoteSchema)`                    | `{ title?, content?, color?, images? }`               | Actualiza campos (parcial)                        |
| DELETE | `/:id`                          | —                                               | —                                                     | Soft delete si activa; hard delete si ya en papelera |
| PATCH  | `/:id/pin`                      | —                                               | —                                                     | Alterna `is_pinned`                                |
| PATCH  | `/:id/mark`                     | —                                               | —                                                     | Alterna `is_marked`                                |
| POST   | `/unmark-all`                   | —                                               | —                                                     | Desmarca todas las notas del usuario              |
| GET    | `/trash`                        | —                                               | —                                                     | Notas en papelera                                  |
| POST   | `/trash/:id/restore`            | —                                               | —                                                     | Restaura una nota de la papelera                  |
| DELETE | `/trash/empty`                  | —                                               | —                                                     | Vacía la papelera del usuario                     |
| GET    | `/sort-preferences`             | —                                               | —                                                     | Devuelve `defaultNoteSort`, `defaultNoteSortDirection` |
| POST   | `/sort-preferences`             | —                                               | `{ sortBy, sortDir }`                                 | Guarda preferencias de ordenación                 |
| POST   | `/upload-image`                 | `upload (multer)`, `handleMulterError`          | multipart `image`                                     | Sube imagen de nota                               |

### 5.5 Notas compartidas (`/api/notes`)

| Método | Ruta                              | Middleware                | Body / Query                                       | Descripción                                                   |
| ------ | --------------------------------- | ------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| POST   | `/share`                          | `authenticateToken`       | `{ noteId, sharedWithId, canEdit, includeImages }` | Crea o actualiza el sharing si ya existe                       |
| GET    | `/shared-notes`                   | `authenticateToken`       | —                                                  | Notas que otros usuarios comparten conmigo                    |
| PUT    | `/:id/share-permissions`          | `authenticateToken`       | `{ canEdit, includeImages }`                       | Cambia los permisos de una nota compartida (sólo owner)       |
| PUT    | `/shared-notes/:id`               | `authenticateToken`       | `{ title?, content?, images? }`                    | Edición por destinatario (requiere `can_edit = true`)         |
| GET    | `/users?query=...`                | `authenticateToken`       | `?query`                                           | Busca usuarios por username (no devuelve email)               |

### 5.6 Grupos de notas personales (`/api/groups`)

Definidos en `routes/noteGroupRoutes.ts`. Todos requieren `authenticateToken`.

| Método | Ruta                              | Body                                  | Descripción                                       |
| ------ | --------------------------------- | ------------------------------------- | ------------------------------------------------- |
| GET    | `/`                               | —                                     | Lista grupos del usuario                          |
| POST   | `/`                               | `{ name, color }`                     | Crea grupo                                         |
| PUT    | `/:id`                            | `{ name?, color?, position? }`        | Actualiza grupo                                    |
| DELETE | `/:id`                            | —                                     | Elimina grupo                                      |
| PUT    | `/reorder`                        | `{ orderedIds: [...] }`               | Reordena la lista de grupos                       |
| POST   | `/add-note`                       | `{ groupId, noteId }`                 | Añade nota a grupo (tabla puente `note_group_items`) |
| DELETE | `/:groupId/notes/:noteId`         | —                                     | Quita nota del grupo                              |
| POST   | `/notes/upload-image`             | multipart `image`                     | Sube imagen para nota de grupo personal           |
| DELETE | `/notes/:noteId/images/:imageIndex` | —                                   | Elimina la imagen N de una nota de grupo personal |

### 5.7 Grupos de usuarios colaborativos (`/api/user-groups`)

Todos requieren `authenticateToken`.

| Método | Ruta                                          | Body / Query                              | Descripción                                                          |
| ------ | --------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| GET    | `/`                                           | —                                         | Grupos en los que el usuario es miembro                              |
| POST   | `/`                                           | `{ name, description? }`                  | Crea grupo (creator pasa a `owner`)                                  |
| GET    | `/:id`                                        | —                                         | Detalle del grupo (sólo si es miembro)                               |
| PUT    | `/:id`                                        | `{ name?, description? }`                 | Actualiza grupo                                                      |
| DELETE | `/:id`                                        | —                                         | Borra el grupo (sólo owner)                                          |
| PUT    | `/:id/rename`                                 | `{ name }`                                | Renombra                                                             |
| PUT    | `/:id/description`                            | `{ description }`                         | Actualiza descripción                                                |
| GET    | `/:id/members`                                | —                                         | Lista miembros (id, username, role, joined_at)                       |
| POST   | `/:id/members`                                | `{ username, role }`                      | Añade miembro existente (rol `admin` o `member`)                     |
| DELETE | `/:id/members/:userId`                        | —                                         | Expulsa miembro (admin no puede expulsar a owner ni a otros admins)  |
| PUT    | `/:id/members/:userId/role`                   | `{ role }`                                | Cambia rol (sólo admin/owner; no se cambia uno mismo)                |
| POST   | `/:id/invite`                                 | `{ email }`                               | Invita por email (envía link)                                        |
| GET    | `/:id/search-users?query=...`                 | `?query`                                  | Busca usuarios para invitar (excluye miembros actuales)              |
| POST   | `/:id/leave`                                  | —                                         | Abandona el grupo (owner debe transferir antes)                      |
| POST   | `/:id/transfer-ownership`                     | `{ newOwnerId }`                          | Transfiere ownership a otro miembro                                  |
| GET    | `/:id/notes`                                  | —                                         | Notas del grupo                                                      |
| POST   | `/:id/notes`                                  | `{ title, content?, color?, images? }`    | Crea nota de grupo (autor = usuario actual)                          |
| GET    | `/:id/notes/:noteId`                          | —                                         | Detalle de una nota de grupo                                         |
| PUT    | `/:id/notes/:noteId`                          | `{ title?, content?, color?, images? }`   | Edita nota                                                           |
| DELETE | `/:id/notes/:noteId`                          | —                                         | Elimina nota de grupo                                                |
| PATCH  | `/:id/notes/:noteId/pin`                      | —                                         | Alterna fijado                                                       |
| POST   | `/:id/notes/upload-image`                     | multipart `image`                         | Sube imagen para nota de grupo                                       |

### 5.8 Recordatorios (`/api/reminders`)

Todos requieren `authenticateToken`.

| Método | Ruta                | Middleware                                     | Body / Query                                           | Descripción                                  |
| ------ | ------------------- | ---------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| GET    | `/`                 | —                                              | `?from&to&statusId`                                    | Lista recordatorios                          |
| POST   | `/`                 | `validate(createReminderSchema)`               | `{ title, description?, date_time, has_time?, send_email?, recurrence? }` | Crea recordatorio  |
| GET    | `/search?q=...`     | —                                              | `?q`                                                   | Búsqueda por texto en título/descripción     |
| PUT    | `/:id`              | `validate(updateReminderSchema)`               | Mismos campos que POST                                 | Edita recordatorio                           |
| PATCH  | `/:id/status`       | `validate(updateReminderStatusSchema)`         | `{ status_id: 1|2|3 }`                                 | Cambia estado (pendiente/completado/cancelado) |
| DELETE | `/:id`              | —                                              | —                                                      | Elimina recordatorio                         |

### 5.9 Contacto (`/api/contact`)

| Método | Ruta | Middleware                       | Body                                | Descripción                                  |
| ------ | ---- | -------------------------------- | ----------------------------------- | -------------------------------------------- |
| POST   | `/`  | `contactLimiter`                 | `{ name, email, message }`          | Envía email al equipo (sin autenticación)    |

### 5.10 Códigos de error comunes

| HTTP | `error.code`        | Causa típica                                       |
| ---- | ------------------- | --------------------------------------------------- |
| 400  | `BAD_REQUEST`       | Body o query no válidos                            |
| 401  | `UNAUTHORIZED`      | Falta token, expirado, revocado, mal firmado       |
| 403  | `FORBIDDEN`         | Rol insuficiente para la operación                 |
| 404  | `NOT_FOUND`         | Recurso inexistente                                 |
| 409  | `CONFLICT`          | Violación de UNIQUE (e.g., email ya registrado)    |
| 422  | `VALIDATION_ERROR`  | Zod schema rechazado (lista en `error.errors`)     |
| 429  | `TOO_MANY_REQUESTS` | Rate limit alcanzado                                |
| 500  | `INTERNAL_ERROR`    | Error no controlado                                 |

---

## 6. Referencia del frontend

### 6.1 Páginas

| Ruta                       | Componente             | Tipo     | Resumen                                                          |
| -------------------------- | ---------------------- | -------- | ---------------------------------------------------------------- |
| `/`                        | `Home`                 | Pública  | Landing pública                                                  |
| `/login`                   | `Login`                | Pública  | Login + tab de registro                                          |
| `/forgot-password`         | `ForgotPassword`       | Pública  | Solicita reset de contraseña                                     |
| `/reset-password/:token`   | `ResetPassword`        | Pública  | Establece nueva contraseña                                       |
| `/notes`                   | `Notes`                | Privada  | Vista principal de notas (propias + compartidas + grupos personales) |
| `/trash`                   | `Trash`                | Privada  | Papelera                                                         |
| `/reminders`               | `Reminders`            | Privada  | Calendario y lista de recordatorios                              |
| `/groups`                  | `Groups`               | Privada  | Espacios colaborativos                                           |
| `/settings`                | `settings`             | Privada  | Perfil, ajustes, gestión de cuenta                               |

Las rutas privadas se envuelven en `<PrivateRoute>` (`App.tsx`), que delega a `authService.isAuthenticated()`.

### 6.2 Componentes destacados

#### Layout
- **`Header`** (`components/Layout/Header.tsx`): logo, navegación principal, menú de usuario con avatar (`useProfileImage`) y logout.

#### Notas
- **`NotesContent`**: orquesta tabs, grids y formularios.
- **`NotesGrid` / `SharedNotesGrid`**: rejilla masonry.
- **`NoteCard`**: nota individual; autosave con indicador “Guardando…/Guardado”.
- **`NoteActionsMenu`**, **`NoteActionsMenuBase`**: exportar (PDF/TXT), insertar listas, gestionar imágenes.
- **`ShareNote`**: modal para compartir.
- **`GroupSidebar` / `GroupModal`**: gestión de grupos personales de notas.
- **`CreateNoteForm`**: formulario rápido.
- **`NoteSort`**, **`NoteTabs`**, **`BulkActionsMenu`**, **`DateFilter`**, **`NoteImage`**.

#### Recordatorios
- **`ReminderDashboard`**, **`ReminderList`**, **`ReminderDetail`**.
- **`ReminderForm`**: alta/edición.
- **`CalendarGrid`** + **`MiniCalendar`**: vista mensual y mini-cal navegable.
- **`WeekView` / `WeekViewPopup`**: vista semanal.
- **`StatusSelector`**: pendiente/completado/cancelado.

#### Grupos colaborativos
- **`UserGroupSidebar`**, **`CreateGroupModal`**, **`AddMemberModal`**, **`GroupTabs`**, **`GroupNotes`**, **`GroupNotesGrid`**, **`CreateGroupNoteForm`**, **`GroupOfMembersList`**, **`GroupNoteActionsMenu`**.

#### Auth y comunes
- **`PasswordStrengthIndicator`**: feedback en tiempo real.
- **`PrivateRoute`**: guard de rutas.
- **`ThemeProvider`** (a través de `themeService`): aplica variables CSS.

### 6.3 Hooks personalizados

| Hook                | Responsabilidad principal                                                              |
| ------------------- | -------------------------------------------------------------------------------------- |
| `useAuth`           | Acceso al `AuthContext`; expone `user`, `isAuthenticated`, `logout()`, `updateUserProfile()` |
| `useNotes`          | CRUD de notas + filtros + paginación + estado de marcado/fijado                       |
| `useGroups` (alias `useNoteGroups`) | Grupos personales y grupo activo según la ruta                       |
| `useSharedNotes`    | Carga y edición de notas compartidas                                                   |
| `useUserGroups`     | Grupos colaborativos: listado, creación, edición, miembros                             |
| `useUIEffects`      | Foco visual sobre notas, lock de scroll del body                                       |
| `useTextEditor`     | Lógica de inserción de listas/markdown ligera en textareas                             |
| `useTextareaResize` | Auto-altura de textarea                                                                 |
| `useGroupActions`   | Acciones masivas dentro de la página de grupos personales                             |
| `useClickOutside`   | Detección de clic fuera de un ref                                                      |
| `useImageLoader`    | Carga diferida y manejo de errores de imágenes                                         |
| `useProfileImage`   | Imagen de perfil con caché en localStorage                                             |

### 6.4 Contextos

| Contexto          | Estado expuesto                                                                                | Persistencia                  |
| ----------------- | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| `AuthContext`     | `user`, `token`, `loading`, `isAuthenticated`, `setUser`, `setToken`, `updateUserProfile`, `logout` | `localStorage` (`user`, `token`, `refreshToken`) |
| `SettingsContext` | `theme`, `defaultNoteSort`, `defaultNoteSortDirection`, `defaultPage`, `confirmDelete`, `language`, `notificationsEnabled` | Servidor (`/account/settings`) + `localStorage` fallback |
| `NotesContext`   | Estado/handlers de la página de notas (`activeGroup`, `markedNotes`, `focusedNoteId`, `handleDeleteNote`, etc.) | Solo en memoria; instanciado dentro de `pages/Notes.tsx` |

### 6.5 Capa de servicios (`services/api.ts`)

`services/api.ts` expone una única instancia de axios con interceptores que:

1. Añaden `Authorization: Bearer <accessToken>` desde `localStorage`.
2. Detectan respuestas 401 e intentan `POST /api/auth/refresh`. Si tiene éxito, reintentan la petición original. Si falla, limpian sesión y redirigen a `/login` con `window.location.href`.
3. Encolan peticiones concurrentes durante el refresh para evitar múltiples llamadas simultáneas (`refreshSubscribers`).

Exporta agrupaciones funcionales: `authService`, `accountService`, `notesService`, `sharedNotesService`, `groupsService`, `userGroupsService`, `remindersService`, `passwordService`, `contactService`.

### 6.6 Sanitización y exportación

- `utils/sanitize.ts` envuelve DOMPurify. Funciones: `sanitizeHTML`, `sanitizePlainText`, `sanitizeArray`.
- `utils/exportHelpers.ts` usa estas funciones para producir PDF (vía DOM-to-canvas) o TXT a partir de notas. Para PDF, las imágenes embedded deben tener una URL pública accesible (sirve `REACT_APP_API_URL` como base).

---

## 7. Pruebas

### 7.1 Backend

- Framework: Jest 29 + Supertest + ts-jest.
- Carpeta: `backend/src/__tests__/`.
- Mocks: `pg.Pool` mockeado globalmente; no se usa una BD real.
- Comando: `cd backend && npm test`.
- Cobertura medida: aproximadamente **12 % de statements**. Áreas cubiertas: auth, validación Zod, middleware auth/validate, notas CRUD, sharing, group members. Áreas SIN tests: recordatorios, password recovery, account, group notes, services, routes en bruto, error handler.

### 7.2 Frontend

- Framework: React Testing Library + Jest (vía react-scripts).
- Tests existentes: `App.test.tsx` (smoke), `AuthContext.test.tsx`, `NotesContext.test.tsx`, `SettingsContext.test.tsx`, `PasswordStrengthIndicator.test.tsx`, `useClickOutside.test.tsx`.
- Comando: `cd frontend && npm test`.
- No hay reporte de cobertura generado.

### 7.3 No hay tests E2E

No hay Cypress/Playwright. La conjunción frontend↔backend solo se valida manualmente.

---

## 8. Scripts disponibles

### 8.1 Backend (`backend/package.json`)

| Script        | Comando                       | Uso                                        |
| ------------- | ----------------------------- | ------------------------------------------ |
| `npm start`   | `ts-node src/index.ts`        | Arranque en producción manual              |
| `npm run dev` | `nodemon src/index.ts`        | Desarrollo con recarga automática          |
| `npm run build` | `tsc`                       | Compila TypeScript a `dist/`               |
| `npm test`    | `jest`                        | Ejecuta los tests con cobertura            |

No hay scripts para `lint`, `format`, `typecheck` ni `db:migrate`. ESLint y Prettier están configurados pero deben invocarse manualmente.

### 8.2 Frontend (`frontend/package.json`)

| Script         | Comando                  | Uso                                |
| -------------- | ------------------------ | ---------------------------------- |
| `npm start`    | `react-scripts start`    | Desarrollo en `http://localhost:3000` |
| `npm run build`| `react-scripts build`    | Build de producción en `build/`    |
| `npm test`     | `react-scripts test`     | Tests en watch mode                |
| `npm run eject`| `react-scripts eject`    | Eject de Create React App          |

---

## 9. Despliegue

### 9.1 Modelo recomendado (no automatizado actualmente)

- **PostgreSQL**: instancia gestionada (RDS, Cloud SQL, Render, etc.) o el `docker-compose` propuesto. Es **imprescindible** habilitar TLS y rotar contraseñas reales por las del `.env.docker.example`.
- **Backend**: Node 18 LTS o superior. Variables obligatorias: `JWT_SECRET`, `DB_*`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `APP_URL`. Recomendado tras un proxy (Nginx, Cloudflare) que aplique TLS, CORS, HSTS, compresión y rate limit transversal. Persistencia para `backend/uploads/`.
- **Frontend**: `npm run build` y servir `build/` con cualquier estático (Nginx, Vercel, Netlify). El bundle es inmutable: `REACT_APP_API_URL` se fija en build.
- **Email**: Gmail con app password o sustituir el transporte por SES/Sendgrid.

### 9.2 Limitaciones conocidas

- No existe Dockerfile para la app: hay que ejecutar el backend en el host o crear uno manualmente.
- Las imágenes se guardan en disco local. Para escalar horizontalmente sería necesario migrar a S3/MinIO.
- No hay pipeline CI/CD: tests, lint y build se ejecutan a mano.
- No hay sistema de migraciones automatizado. Cualquier cambio al schema debe replicarse manualmente en `database.sql` y `docker/postgres/init/01_schema.sql`.

Estas y otras observaciones detalladas se recogen, con severidad y referencia exacta, en [`pending-tasks.md`](./pending-tasks.md).
