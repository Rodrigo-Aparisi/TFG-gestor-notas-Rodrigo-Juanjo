# Olympus Scribe — Gestor de Notas y Recordatorios

Aplicación web para gestionar notas personales, recordatorios y grupos colaborativos de usuarios. Desarrollada como Trabajo de Fin de Grado (TFG) por Rodrigo y Juanjo.

---

## Funcionalidades principales

- **Notas**: creación, edición, borrado suave con papelera, fijado (pin), marcado, subida de imágenes, exportación a PDF/TXT, ordenación personalizable.
- **Notas compartidas**: compartir notas con otros usuarios con permisos de solo lectura o edición.
- **Grupos de notas**: organizar notas propias en carpetas/grupos.
- **Grupos de usuarios**: espacios colaborativos con roles (owner, admin, member), notas compartidas de grupo, invitación por email.
- **Recordatorios**: calendario mensual/semanal, búsqueda por texto, estados (pendiente, completado, cancelado), notificación por email opcional.
- **Cuenta**: perfil con avatar, cambio de contraseña, ajustes de tema e idioma, eliminación de cuenta.
- **Recuperación de contraseña**: flujo completo por email con token de un solo uso (TTL 1 hora).

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React | 18.3.1 |
| Frontend | TypeScript | 4.9.5 |
| Frontend | Tailwind CSS | 4.0.6 |
| Frontend | react-router-dom | 7.1.3 |
| Frontend | react-hook-form | 7.56.4 |
| Frontend | react-hot-toast | 2.6.0 |
| Frontend | axios | 1.7.9 |
| Frontend | DOMPurify | 3.3.1 |
| Backend | Node.js | >= 18 |
| Backend | Express | 4.21.2 |
| Backend | TypeScript | 5.7.3 |
| Backend | pg (node-postgres) | 8.11.3 |
| Backend | Zod | 3.25.76 |
| Backend | jsonwebtoken | 9.0.2 |
| Backend | bcrypt | 5.1.1 |
| Backend | Nodemailer | 7.0.3 |
| Backend | Multer | 1.4.5-lts.1 |
| Backend | Helmet | 8.1.0 |
| Backend | Winston | 3.19.0 |
| Base de datos | PostgreSQL | >= 14 |
| Testing | Jest + Supertest | backend |
| Testing | Testing Library | frontend |

---

## Requisitos previos

- **Node.js** >= 18 (se recomienda LTS)
- **npm** >= 9
- **PostgreSQL** >= 14 en ejecución local o remota

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd TFG-gestor-notas-Rodrigo-Juanjo
```

### 2. Configurar el backend

```bash
cd backend
npm install
```

Crear `backend/.env` con las variables necesarias (ver sección [Variables de entorno](#variables-de-entorno)).

### 3. Inicializar la base de datos

Ejecutar el script SQL de `database.sql` contra tu instancia de PostgreSQL para crear tablas, vistas y triggers.

```bash
psql -U <usuario> -d <base_de_datos> -f database.sql
```

### 4. Configurar el frontend

```bash
cd ../frontend
npm install
```

Crear `frontend/.env` con `REACT_APP_API_URL=http://localhost:3001/api`.

---

## Ejecución en desarrollo

Abrir dos terminales en paralelo:

```bash
# Terminal 1 — Backend (puerto 3001 por defecto)
cd backend
npm run dev

# Terminal 2 — Frontend (puerto 3000 por defecto)
cd frontend
npm start
```

---

## Tests

```bash
# Tests backend
cd backend
npm test

# Tests frontend
cd frontend
npm test

# Compilar TypeScript (backend)
cd backend
npm run build
```

---

## Variables de entorno

### Backend — `backend/.env`

```env
# Base de datos
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/olympus_scribe

# Autenticación JWT
JWT_SECRET=tu_secreto_jwt_muy_largo_y_aleatorio

# Servidor
PORT=3001
NODE_ENV=development

# Email (Nodemailer)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=noreply@example.com
EMAIL_PASS=contraseña_email
EMAIL_FROM=Olympus Scribe <noreply@example.com>

# URL pública del servidor (para construir links en emails y URLs de imágenes)
SERVER_URL=http://localhost:3001
```

### Frontend — `frontend/.env`

```env
# URL base de la API REST
REACT_APP_API_URL=http://localhost:3001/api
```

---

## Estructura del proyecto

```
TFG-gestor-notas-Rodrigo-Juanjo/
├── backend/
│   └── src/
│       ├── config/          # Multer, logger, configuraciones
│       ├── controllers/     # Lógica de negocio
│       │   ├── auth.controller.ts
│       │   ├── accountController.ts
│       │   ├── passwordController.ts
│       │   ├── reminderController.ts
│       │   ├── note/        # NoteCrudController, NoteSharingController, NoteGroupController
│       │   └── usergroup/   # UserGroupCrudController, GroupMemberController, GroupNoteController
│       ├── errors/          # AppError, BadRequestError, NotFoundError, etc.
│       ├── middleware/      # auth, validate, rateLimiter, upload
│       ├── models/          # Tipos TypeScript y modelo Reminder
│       ├── routes/          # auth, noteRoutes, reminderRoutes, userGroupsRoutes, accountRoutes...
│       ├── services/        # emailService, emailSchedulerService
│       ├── utils/           # queryHelpers, urlHelpers, pathHelpers
│       ├── validation/
│       │   └── schemas/     # Zod schemas: user, note, reminder, group
│       └── index.ts         # Entrada principal, registro de rutas
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout/      # Header
│       │   ├── Notes/       # NoteCard, NotesGrid, CreateNoteForm, ShareNote...
│       │   ├── Reminders/   # ReminderCard, ReminderForm, CalendarGrid, WeekView...
│       │   └── UserGroups/  # GroupNotes, AddMemberModal, CreateGroupModal...
│       ├── contexts/        # AuthContext, NotesContext, SettingsContext
│       ├── hooks/           # useNotes, useUserGroups, useNoteGroups, useProfileImage...
│       ├── pages/           # Login, Notes, Reminders, Groups, Trash, settings...
│       ├── services/        # api.ts (axios + interceptores JWT), auth.ts
│       ├── styles/          # CSS por página
│       ├── types/           # Interfaces TypeScript globales
│       └── utils/           # exportHelpers, sanitize
├── docs/
│   ├── api.md               # Documentación de la API REST
│   └── architecture.md      # Arquitectura y decisiones de diseño
└── database.sql             # Schema PostgreSQL completo
```

---

## Docker

El proyecto incluye un `docker-compose.yml` para levantar la base de datos PostgreSQL:

```bash
docker compose up -d
```

---

## Documentación adicional

- [Documentación de la API REST](docs/api.md)
- [Arquitectura y decisiones de diseño](docs/architecture.md)

---

## Licencia

Proyecto académico — TFG Universidad. Uso restringido a fines educativos.
