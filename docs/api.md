# Documentación de la API REST — Olympus Scribe

Base URL: `http://localhost:<PORT>/api`

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <access_token>
```

El access token se obtiene en `POST /auth/login` y tiene una validez de **1 hora**. Se renueva automáticamente con `POST /auth/refresh`.

Formato de error estándar:
```json
{ "success": false, "error": "Mensaje de error", "code": "ERROR_CODE" }
```

---

## Módulo: Auth (`/api/auth`)

### POST /api/auth/register

Registra un nuevo usuario.

**Auth**: No requerida | **Rate limit**: Sí

**Body**:

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| username | string | Sí | 3-50 chars, solo letras/números/guiones/guiones bajos |
| email | string | Sí | Formato email válido |
| password | string | Sí | Min 8 chars, mayúscula, minúscula y número |

**Respuesta 201**:
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "user": { "id": "uuid", "username": "rodrigo", "email": "rodrigo@example.com", "created_at": "..." }
}
```

**Errores**: `400` campos faltantes (`MISSING_FIELDS`), `400` usuario/email ya existe (`USER_EXISTS`)

---

### POST /api/auth/login

Autentica al usuario y devuelve tokens JWT.

**Auth**: No requerida | **Rate limit**: Sí

**Body**:

| Campo | Tipo | Requerido |
|---|---|---|
| email | string | Sí |
| password | string | Sí |

**Respuesta 200**:
```json
{
  "success": true,
  "token": "<access_token>",
  "refreshToken": "<refresh_token>",
  "user": { "id": "uuid", "username": "rodrigo", "email": "...", "profile_image": "http://..." },
  "settings": { "theme": "dark", "notifications_enabled": true, "language": "es" }
}
```

**Errores**: `400` campos faltantes, `404` correo no encontrado (`USER_NOT_FOUND`), `401` contraseña incorrecta (`INVALID_PASSWORD`)

---

### POST /api/auth/refresh

Renueva el access token usando el refresh token.

**Auth**: No requerida

**Body**: `{ "refreshToken": string }`

**Respuesta 200**: `{ "success": true, "token": "<nuevo_access_token>" }`

**Errores**: `401` token ausente, `403` token inválido o expirado

---

### POST /api/auth/logout

Revoca el access token (blacklist) y elimina el refresh token de la BD.

**Auth**: Requerida

**Body** (opcional): `{ "refreshToken": string }`

**Respuesta 200**: `{ "success": true, "message": "Logout exitoso" }`

---

## Módulo: Notas (`/api/notes`)

Todos los endpoints requieren autenticación.

### GET /api/notes

Obtiene las notas activas del usuario.

**Query params**: `page` (default 1), `limit` (default 50, máx 100), `paginate` (default true)

**Respuesta 200**:
```json
{
  "notes": [{ "id": "uuid", "title": "...", "content": "...", "is_pinned": false, "is_marked": false, "images": [], "color": null, "created_at": "..." }],
  "pagination": { "page": 1, "limit": 50, "totalNotes": 12, "totalPages": 1, "hasMore": false }
}
```

---

### POST /api/notes

Crea una nueva nota.

**Body** (validado por `createNoteSchema`):

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| title | string | Sí | 1-200 chars |
| content | string | No | Máx. 50000 chars |
| color | string | No | Hex `#RRGGBB` |
| images | string[] | No | URLs válidas, máx. 10 |

**Respuesta 201**: `{ "message": "Nota creada exitosamente", "note": { ... } }`

**Errores**: `400` título vacío

---

### PUT /api/notes/:id

Actualiza una nota del usuario.

**Body**: Igual que `POST /api/notes` (todos los campos opcionales)

**Errores**: `404` nota no encontrada o no pertenece al usuario

---

### DELETE /api/notes/:id

Mueve a papelera si está activa; elimina permanentemente si ya estaba en papelera.

**Respuesta 200**: `{ "message": "Nota movida a la papelera" }` o `{ "message": "Nota eliminada permanentemente" }`

---

### PATCH /api/notes/:id/pin

Toggle del fijado de una nota.

**Respuesta 200**: `{ "note": { ..., "is_pinned": true } }`

---

### PATCH /api/notes/:id/mark

Toggle del marcado de una nota.

**Respuesta 200**: `{ "note": { ..., "is_marked": true } }`

---

### POST /api/notes/unmark-all

Desmarca todas las notas del usuario.

---

### GET /api/notes/trash

Lista las notas en la papelera.

**Respuesta 200**: `{ "notes": [{ ..., "deleted_at": "..." }] }`

---

### POST /api/notes/trash/:id/restore

Restaura una nota de la papelera.

---

### DELETE /api/notes/trash/empty

Vacía completamente la papelera del usuario.

---

### POST /api/notes/share

Comparte una nota con otro usuario.

**Body**:

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| noteId | string (UUID) | Sí | ID de la nota |
| username | string | Sí | Username del destinatario |
| canEdit | boolean | No | Permiso de edición (default: false) |
| includeImages | boolean | No | Incluir imágenes (default: true) |

**Errores**: `400` compartir consigo mismo, `404` nota o usuario no encontrado

---

### GET /api/notes/shared-notes

Lista las notas compartidas con el usuario autenticado.

**Respuesta 200**: `{ "sharedNotes": [{ "id": "...", "title": "...", "shared_by": "alice", "can_edit": false }] }`

---

### PUT /api/notes/:id/share-permissions

Actualiza permisos de una nota compartida (solo el owner).

**Body**: `{ "username": string, "canEdit": boolean, "includeImages?": boolean }`

---

### PUT /api/notes/shared-notes/:id

Edita contenido de una nota compartida (requiere `can_edit`). Solo `title` y `content`.

**Errores**: `403` sin permiso, `400` sin campos, `404` nota no encontrada

---

### GET /api/notes/users

Busca usuarios por username (para compartir notas). El campo `email` no se devuelve.

**Query params**: `query` — texto de búsqueda (mín. 2 chars)

**Respuesta 200**: `{ "users": [{ "id": "uuid", "username": "alice" }] }`

---

### GET /api/notes/sort-preferences

Obtiene preferencias de ordenación del usuario.

**Respuesta 200**: `{ "success": true, "preferences": { "sortType": "date", "sortDirection": "desc" } }`

Valores de `sortType`: `date`, `title`, `pinned`

---

### POST /api/notes/sort-preferences

Guarda preferencias de ordenación.

**Body**: `{ "sortType": string, "sortDirection": "asc"|"desc" }`

---

### POST /api/notes/upload-image

Sube una imagen para adjuntar a una nota. Multipart/form-data con campo `image`.

**Respuesta 200**: `{ "message": "Imagen subida correctamente", "data": { "imageUrl": "/uploads/note-images/..." } }`

---

## Módulo: Grupos de notas (`/api/groups`)

Grupos para organizar las notas propias del usuario.

### GET /api/groups — Lista grupos del usuario
### POST /api/groups — Crea grupo (`{ name, color?, noteIds? }`)
### PUT /api/groups/:id — Actualiza nombre y color
### DELETE /api/groups/:id — Elimina grupo (las notas no se eliminan)
### PUT /api/groups/reorder — Reordena grupos (`{ groupIds: string[] }`)
### POST /api/groups/add-note — Añade nota a grupo (`{ groupId, noteId }`)
### DELETE /api/groups/:groupId/notes/:noteId — Elimina nota de grupo

---

## Módulo: Recordatorios (`/api/reminders`)

Todos los endpoints requieren autenticación.

### GET /api/reminders

**Query params**: `startDate` y `endDate` (ISO 8601, ambos requeridos)

**Respuesta 200**: `{ "reminders": [{ "id": "uuid", "title": "...", "dateTime": "...", "hasTime": true, "statusId": 1 }] }`

---

### POST /api/reminders

**Body** (validado por `createReminderSchema`):

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| title | string | Sí | 1-200 chars |
| description | string | No | Máx. 1000 chars |
| dateTime | string (ISO 8601) | Sí | Fecha futura |
| hasTime | boolean | No | Default: true |
| sendEmail | boolean | No | Default: false |

**Respuesta 201**: `{ "reminder": { ... } }`

---

### GET /api/reminders/search

Busca recordatorios por texto con `ILIKE`.

**Query params**: `query` (requerido), `startDate?`, `endDate?`

---

### PUT /api/reminders/:id

Actualiza un recordatorio. Body igual que POST, más `statusId` (1/2/3).

---

### PATCH /api/reminders/:id/status

Actualiza solo el estado. **Body**: `{ "statusId": 1 | 2 | 3 }`

- 1 = pendiente
- 2 = completado
- 3 = cancelado

---

### DELETE /api/reminders/:id

Elimina un recordatorio.

---

## Módulo: Grupos de usuarios (`/api/user-groups`)

Todos los endpoints requieren autenticación.

### GET /api/user-groups — Lista grupos del usuario
### POST /api/user-groups — Crea grupo (crea con rol owner)

**Body**: `{ name: string (1-100 chars), description?: string }`

### GET /api/user-groups/:id — Detalles de un grupo
### PUT /api/user-groups/:id — Actualiza grupo (owner o admin)
### DELETE /api/user-groups/:id — Elimina grupo (solo owner)
### PUT /api/user-groups/:id/rename — `{ name: string }`
### PUT /api/user-groups/:id/description — `{ description: string }`

### GET /api/user-groups/:id/members — Lista miembros con roles

### POST /api/user-groups/:id/members — Añade miembro

**Body**: `{ username: string, role: "admin"|"member" }`
**Permisos**: owner o admin (admin no puede añadir admin)

### DELETE /api/user-groups/:id/members/:userId — Elimina miembro (owner o admin)
### PUT /api/user-groups/:id/members/:userId/role — Cambia rol (`{ role: "admin"|"member" }`)
### POST /api/user-groups/:id/leave — El usuario abandona el grupo (el owner no puede)
### POST /api/user-groups/:id/transfer-ownership — Transfiere propiedad

**Body**: `{ newOwnerId: string (UUID) }` — debe ser miembro del grupo

### GET /api/user-groups/:id/notes — Lista notas del grupo
### POST /api/user-groups/:id/notes — Crea nota en el grupo
### GET /api/user-groups/:id/notes/:noteId — Obtiene una nota del grupo
### PUT /api/user-groups/:id/notes/:noteId — Actualiza nota (owner o admin)
### DELETE /api/user-groups/:id/notes/:noteId — Elimina nota (owner o admin)
### PATCH /api/user-groups/:id/notes/:noteId/pin — Toggle pin de nota de grupo
### POST /api/user-groups/:id/notes/upload-image — Sube imagen (multipart, campo `image`)
### POST /api/user-groups/:id/invite — Invita por email (`{ email: string }`)
### GET /api/user-groups/:id/search-users — Busca usuarios para invitar (`?q=texto`)

---

## Módulo: Cuenta (`/api/account`)

Todos los endpoints requieren autenticación.

### GET /api/account/profile — Perfil del usuario autenticado

**Respuesta 200**: `{ "user": { "id", "username", "email", "profile_image", "created_at" } }`

---

### PUT /api/account/update — Actualiza perfil

**Body**:

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| currentPassword | string | Sí | Contraseña actual para confirmar |
| username | string | No | Nuevo username |
| email | string | No | Nuevo email |
| newPassword | string | No | Nueva contraseña (min 8 chars, mayúscula, minúscula, número) |

**Errores**: `401` contraseña actual incorrecta

---

### DELETE /api/account/delete — Elimina la cuenta

**Body**: `{ password: string }` — confirma la acción

---

### GET /api/account/settings — Obtiene ajustes del usuario

**Respuesta 200**: `{ "theme": "dark", "notifications_enabled": true, "language": "es" }`
Si no existen, los crea con valores por defecto.

---

### PUT /api/account/settings — Actualiza ajustes

**Body**: `{ theme?, notifications_enabled?, language? }`

---

### POST /api/account/upload-profile-image — Sube imagen de perfil

Multipart/form-data con campo `image`.

**Respuesta 200**: `{ "message": "...", "profile_image": "http://...", "user": { ... } }`

---

## Módulo: Contraseña (`/api/password`)

### POST /api/password/request-reset — Solicita reset por email

**Auth**: No requerida | **Rate limit**: Sí

**Body**: `{ email: string }`

**Respuesta 200**: Siempre el mismo mensaje (no revela si el email existe)

---

### GET /api/password/validate-token/:token — Verifica token de reset

**Respuesta 200**: `{ "valid": true }` o `{ "valid": false }`

---

### POST /api/password/reset — Restablece contraseña

**Auth**: No requerida | **Rate limit**: Sí

**Body**: `{ token: string, newPassword: string }`

Operación atómica (transacción BD). El token queda marcado como `used`.

**Errores**: `400` token inválido o expirado

---

## Módulo: Contacto (`/api/contact`)

### POST /api/contact — Envía mensaje al equipo

**Auth**: No requerida | **Rate limit**: 5 req/hora por IP

**Body**: `{ name: string, email: string, message: string }`

**Respuesta 200**: `{ "success": true, "message": "Mensaje enviado correctamente" }`

---

## Códigos de error comunes

| Código HTTP | Significado |
|---|---|
| 400 | Bad Request — validación fallida, campos incorrectos o lógica de negocio inválida |
| 401 | Unauthorized — token ausente, expirado o credenciales incorrectas |
| 403 | Forbidden — token revocado, sin permisos o tipo de token incorrecto |
| 404 | Not Found — recurso no encontrado o no pertenece al usuario |
| 429 | Too Many Requests — rate limiting activado |
| 500 | Internal Server Error — error inesperado del servidor |
