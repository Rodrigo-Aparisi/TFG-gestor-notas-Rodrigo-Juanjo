# Arquitectura — Olympus Scribe

## Visión general

Olympus Scribe sigue una arquitectura cliente-servidor clásica con separación estricta entre frontend (SPA React) y backend (API REST Express). El sistema es síncrono y stateless entre peticiones, con estado de autenticación gestionado mediante JWT.

```
[Navegador]
     |
     | HTTPS (JSON)
     v
[React SPA — CRA]
  contexts/   hooks/   services/
     |
     | axios (+ interceptor JWT automático)
     v
[Express API — Node.js]
  routes/ → middleware/ → controllers/ → BD
     |
     v
[PostgreSQL]
  Queries SQL directas (pg)
```

---

## Decisiones de diseño

### SQL directo sin ORM

Se usa el driver `pg` con queries SQL parametrizadas (`$1`, `$2`, ...) en lugar de un ORM como Prisma o TypeORM. Motivaciones:

- **Control total** sobre las queries y el plan de ejecución.
- **Transparencia**: cada consulta es explícita y auditable.
- **Sin magia**: no hay queries generadas automáticamente que puedan ser ineficientes.
- **Aprendizaje académico**: comprensión directa de SQL, apropiado para un TFG.

Consecuencia: todas las queries deben ser parametrizadas. Nunca se usan template literals para construir SQL (riesgo de inyección SQL).

### JWT con blacklist

Se usa JWT en lugar de sesiones de servidor para mantener el backend stateless y escalable. El esquema de tokens es:

- **Access token**: validez de 1 hora, firmado con `JWT_SECRET`.
- **Refresh token**: validez de 7 días, almacenado en la tabla `refresh_tokens`.
- **Blacklist**: al hacer logout, el access token se inserta en `revoked_tokens` con su fecha de expiración. El middleware `authenticateToken` consulta esta tabla antes de permitir el acceso.
- **Separación de tipos**: los refresh tokens incluyen `type: 'refresh'` en el payload. El middleware rechaza explícitamente tokens de tipo `refresh` usados como access tokens.

### Create React App (CRA)

Se mantiene CRA (`react-scripts`) como toolchain del frontend. Decisión original del TFG; no se migra a Vite para evitar riesgos de rotura durante el desarrollo académico.

### Estado global con Contexts

Se usan tres contextos React en lugar de Redux u otras librerías de estado:

- `AuthContext` — usuario autenticado, token, `isAuthenticated`.
- `NotesContext` — lista de notas del usuario.
- `SettingsContext` — preferencias de tema, idioma y notificaciones.

La lógica de negocio reside en hooks (`useNotes`, `useUserGroups`, `useNoteGroups`, etc.) que consumen los contextos y llaman a los servicios de API.

### CSS mixto: hojas por página + Tailwind

Cada página tiene su propio archivo CSS en `frontend/src/styles/`. Las utilidades de Tailwind CSS 4 se usan para componentes inline.

---

## Flujo de autenticación

```
1. POST /api/auth/login
   ├── Zod valida email y password
   ├── bcrypt.compare(password, hash)
   ├── jwt.sign → access token (1h)
   ├── jwt.sign → refresh token (7d, type:'refresh')
   ├── INSERT refresh_token en BD
   └── Respuesta: { token, refreshToken, user, settings }

2. Peticiones autenticadas
   ├── Frontend añade header: Authorization: Bearer <access_token>
   └── Middleware authenticateToken:
       ├── Extrae token del header
       ├── jwt.verify(token, JWT_SECRET)
       ├── Rechaza si type === 'refresh'
       ├── SELECT en revoked_tokens (blacklist)
       └── req.user = { id, email }

3. Token expirado (401 TOKEN_EXPIRED)
   ├── Interceptor axios detecta 401
   ├── POST /api/auth/refresh con refreshToken
   ├── Backend verifica refresh token en BD
   ├── Genera nuevo access token
   └── Reintenta la petición original con el nuevo token

4. POST /api/auth/logout
   ├── jwt.verify(access_token) → obtiene exp e id
   ├── INSERT en revoked_tokens (blacklist hasta exp)
   └── DELETE refresh_token de la BD
```

---

## Estructura de la base de datos

### Tablas principales

| Tabla | Descripción |
|---|---|
| `users` | Usuarios registrados. Campos: `id` (UUID), `username`, `email`, `password` (bcrypt), `profile_image`, `created_at`, `updated_at` |
| `notes` | Notas de usuario. `id`, `user_id` (FK), `title`, `content`, `images` (array), `is_pinned`, `is_marked`, `is_deleted`, `deleted_at`, `color`, timestamps |
| `note_groups` | Grupos para organizar notas propias. `id`, `user_id`, `name`, `color`, `order` |
| `note_group_items` | Relación muchos-a-muchos entre notas y grupos de notas |
| `shared_notes` | Notas compartidas entre usuarios. `note_id`, `owner_id`, `shared_with_id`, `can_edit`, `include_images` |
| `reminders` | Recordatorios. `id`, `user_id`, `title`, `description`, `date_time`, `has_time`, `send_email`, timestamps |
| `reminder_status` | Estados posibles (1=pendiente, 2=completado, 3=cancelado) |
| `reminder_recurrence` | Configuración de recurrencia de recordatorios |
| `user_groups` | Grupos colaborativos. `id`, `name`, `description`, `owner_id` |
| `group_members` | Miembros con rol (`owner`, `admin`, `member`) |
| `group_notes` | Notas pertenecientes a un grupo de usuarios |
| `settings` | Preferencias por usuario: `theme`, `language`, `notifications_enabled`, `default_note_sort`, `default_note_sort_direction` |
| `refresh_tokens` | Refresh tokens activos. `user_id`, `token`, `expires_at` |
| `revoked_tokens` | Blacklist de access tokens. `token`, `user_id`, `expires_at`, `reason` |
| `password_reset_tokens` | Tokens de recuperación de contraseña. `user_id`, `token`, `expires_at`, `used` |

### Vistas

| Vista | Descripción |
|---|---|
| `v_reminders` | Recordatorios con nombre del estado unido |
| `v_shared_notes` | Notas compartidas con datos del propietario |
| `v_group_notes` | Notas de grupos con datos del grupo |

### Convenciones de BD

- Todos los IDs son `UUID` generados por PostgreSQL (`gen_random_uuid()`).
- Las tablas tienen trigger `updated_at` que se actualiza automáticamente.
- El borrado de notas es lógico (`is_deleted = true`, `deleted_at`). El borrado físico ocurre al vaciar la papelera.
- Contraseñas almacenadas con bcrypt (10 rondas de sal).

---

## Flujo de una petición típica

```
Cliente (React)
  └── noteService.createNote({ title, content })
      └── api.post('/notes', data)             ← axios con interceptor JWT

Express Router: POST /api/notes
  └── authenticateToken                         ← verifica JWT y blacklist
  └── validate(createNoteSchema)                ← Zod: rechaza XSS, valida longitudes
  └── NoteCrudController.createNote()
      └── pool.query('INSERT INTO notes...')    ← SQL parametrizado ($1, $2, ...)
      └── res.status(201).json({ note })

Cliente
  └── NotesContext actualiza estado local
  └── react-hot-toast muestra confirmación
```

---

## Seguridad implementada

| Medida | Implementación |
|---|---|
| Hashing de contraseñas | bcrypt (10 rondas) |
| Autenticación stateless | JWT (access + refresh + blacklist) |
| Validación de entrada | Zod en todos los endpoints |
| Protección XSS (backend) | Rechazo de patterns peligrosos en schemas Zod |
| Protección XSS (frontend) | DOMPurify para HTML renderizado |
| SQL Injection | Queries parametrizadas, nunca template literals |
| Rate limiting | express-rate-limit en auth, contacto y reset de contraseña |
| Headers de seguridad | Helmet con Content-Security-Policy |
| IDOR | Verificación de `user_id` o membresía en cada operación |
| Path traversal en uploads | Extensión derivada del MIME type validado, nunca del nombre original del archivo |
| Token type check | Middleware rechaza tokens con `type === 'refresh'` usados como access tokens |
| Email Header Injection | Sanitización de saltos de línea (`\r\n`) en campos del formulario de contacto |

---

## Estructura de carpetas

### Backend

```
backend/src/
├── config/
│   ├── logger.ts              # Winston: logs por nivel (error/warn/info/debug)
│   ├── multerConfig.ts        # Configuración base de Multer + interfaz RequestWithFile
│   ├── multerConfigNotes.ts   # Multer para imágenes de notas
│   └── multerConfigPFP.ts     # Multer para imágenes de perfil
├── controllers/
│   ├── auth.controller.ts     # register, login, refresh, logout
│   ├── accountController.ts   # profile, update, delete, settings, profile image
│   ├── passwordController.ts  # requestReset, validateToken, resetPassword
│   ├── reminderController.ts  # CRUD recordatorios + búsqueda
│   ├── note/
│   │   ├── NoteCrudController.ts     # CRUD notas, papelera, pin/mark, sort prefs
│   │   ├── NoteSharingController.ts  # Compartir notas, permisos
│   │   └── NoteGroupController.ts    # Grupos de notas propias
│   └── usergroup/
│       ├── UserGroupCrudController.ts  # CRUD grupos de usuarios
│       ├── GroupMemberController.ts    # Miembros, roles, transferencia
│       └── GroupNoteController.ts      # Notas de grupos colaborativos
├── database.ts                # Pool de conexiones PostgreSQL (singleton)
├── errors/
│   └── AppError.ts            # AppError, BadRequestError, NotFoundError,
│                              #   UnauthorizedError, ForbiddenError
├── middleware/
│   ├── auth.ts                # authenticateToken — verifica JWT y blacklist
│   ├── validate.ts            # validate(schema), validateParams, validateQuery
│   ├── rateLimiter.ts         # Limitadores por endpoint (auth, contacto, reset)
│   └── upload.ts              # Multer con validación de MIME type
├── models/
│   ├── reminder.ts            # Clase Reminder con métodos estáticos SQL
│   └── types.ts               # Interfaces TypeScript globales (AuthUser, RequestWithFile...)
├── routes/
│   ├── auth.ts, noteRoutes.ts, noteGroupRoutes.ts
│   ├── reminderRoutes.ts, userGroupsRoutes.ts
│   ├── accountRoutes.ts, passwordRoutes.ts, contact.ts
├── services/
│   ├── emailService.ts           # Envío de emails transaccionales (Nodemailer + EJS)
│   └── emailSchedulerService.ts  # Envío programado de recordatorios por email
├── utils/
│   ├── queryHelpers.ts    # buildOrderByClause
│   ├── urlHelpers.ts      # getProfileImageUrl, getBaseServerUrl
│   └── pathHelpers.ts     # safeDeleteFile (async), extractSafeRelativePath
├── validation/
│   └── schemas/
│       ├── user.schema.ts, note.schema.ts
│       ├── reminder.schema.ts, group.schema.ts
└── index.ts               # Express app, middlewares globales (Helmet, CORS, rate limit), rutas
```

### Frontend

```
frontend/src/
├── components/
│   ├── Auth/
│   │   └── PasswordStrengthIndicator.tsx
│   ├── Layout/
│   │   └── Header.tsx              # Navegación, menú de usuario, imagen de perfil
│   ├── Notes/
│   │   ├── NoteCard.tsx            # Tarjeta de nota con edición inline, pin, mark, export
│   │   ├── SharedNoteCard.tsx      # Tarjeta de nota compartida (editor inline)
│   │   ├── NotesGrid.tsx           # Grid de notas con skeleton loader
│   │   ├── NotesContent.tsx        # Contenedor con tabs (propias/compartidas/grupos)
│   │   ├── NoteTabs.tsx            # Tabs con rol=tablist, navegación por teclado
│   │   ├── CreateNoteForm.tsx      # Formulario de creación
│   │   ├── ShareNote.tsx           # Modal para compartir una nota
│   │   ├── NoteActionsMenu.tsx     # Menú desplegable de acciones de nota
│   │   ├── NoteActionsMenuBase.tsx # Base compartida con GroupNoteActionsMenu
│   │   ├── GroupSidebar.tsx        # Sidebar de grupos de notas
│   │   ├── GroupModal.tsx          # Modal crear/editar grupo de notas
│   │   └── BulkActionsMenu.tsx     # Acciones en bloque (exportar, mover a grupo)
│   ├── Reminders/
│   │   ├── ReminderCard.tsx, ReminderForm.tsx, ReminderDetail.tsx
│   │   ├── ReminderPopup.tsx       # Popup del día con lista de recordatorios
│   │   ├── CalendarGrid.tsx        # Calendario mensual
│   │   ├── WeekView.tsx, WeekViewPopup.tsx
│   │   └── StatusSelector.tsx, ReminderTime.tsx
│   └── UserGroups/
│       ├── UserGroupSidebar.tsx    # Sidebar con lista de grupos
│       ├── GroupNotes.tsx          # Lista de notas de un grupo
│       ├── GroupNotesGrid.tsx      # Grid wrapper
│       ├── GroupNoteActionsMenu.tsx
│       ├── CreateGroupModal.tsx, CreateGroupNoteForm.tsx
│       ├── AddMemberModal.tsx      # Modal con búsqueda de usuarios (autocomplete)
│       └── GroupOfMembersList.tsx
├── contexts/
│   ├── AuthContext.tsx     # token, user, isAuthenticated (derivado), login/logout
│   ├── NotesContext.tsx    # Lista de notas, estado de carga
│   └── SettingsContext.tsx # theme, language, notifications_enabled; carga desde API al montar
├── hooks/
│   ├── useNotes.ts         # CRUD notas, exportar, pin/mark, grupos, compartir
│   ├── useSharedNotes.ts   # Notas compartidas con el usuario
│   ├── useNoteGroups.ts    # Grupos de notas propias (con useCallback)
│   ├── useUserGroups.ts    # Grupos de usuarios + notas de grupo
│   ├── useGroupActions.ts  # Acciones de miembros y roles
│   ├── useProfileImage.ts  # Estado de imagen de perfil (compartido por Header y settings)
│   ├── useUIEffects.tsx    # Efectos visuales (modales, overflow cleanup)
│   └── useTextEditor.ts    # Editor de texto enriquecido
├── pages/
│   ├── Login.tsx           # Login y registro (formMode: 'login'|'register')
│   ├── Notes.tsx, Reminders.tsx, Groups.tsx
│   ├── Trash.tsx, settings.tsx
│   ├── ForgotPassword.tsx, ResetPassword.tsx
│   └── Home.tsx
├── services/
│   ├── api.ts              # Instancia axios compartida con interceptores JWT (refresh automático)
│   ├── auth.ts             # authService: login, logout, getToken, refreshAccessToken
│   ├── accountService.ts   # Perfil, settings, imagen de perfil
│   └── themeService.ts     # Preferencias de tema en localStorage
├── styles/                 # Un archivo CSS por página
├── types/                  # Interfaces TypeScript globales (Note, Reminder, Group...)
└── utils/
    └── exportHelpers.ts    # exportAsPDF compartido (sanitiza HTML con DOMPurify)
```
