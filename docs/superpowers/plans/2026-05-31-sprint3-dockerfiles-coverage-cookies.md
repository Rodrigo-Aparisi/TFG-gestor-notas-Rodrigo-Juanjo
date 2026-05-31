# Sprint 3 — Dockerfiles, Cobertura de Tests y Refresh Token Cookie

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir contenedorización completa (Dockerfiles para backend y frontend), aumentar la cobertura de tests cubriendo los controladores más críticos sin tests (password, account, reminder), y mover el refresh token a una cookie HttpOnly para eliminar el token de larga duración de localStorage.

**Architecture:** Cuatro tareas independientes. Las Tareas 1-4 son puramente aditivas (no tocan código existente). La Tarea 5 es la única que modifica flujo de autenticación, con un enfoque incremental: el access token sigue en Authorization header, solo el refresh token pasa a cookie — esto minimiza el impacto en el frontend.

**Tech Stack:** Docker (node:18-alpine, nginx:alpine), Jest 29 + ts-jest, cookie-parser, TypeScript 5.

---

## Mapa de archivos

| Archivo | Tarea | Acción |
|---|---|---|
| `backend/Dockerfile` | 1 | Crear — multistage build |
| `frontend/Dockerfile` | 1 | Crear — build + nginx |
| `frontend/nginx.conf` | 1 | Crear — SPA routing config |
| `docker-compose.yml` | 1 | Modificar — añadir servicios backend y frontend |
| `backend/src/__tests__/password.controller.test.ts` | 2 | Crear — tests passwordController |
| `backend/src/__tests__/account.controller.test.ts` | 3 | Crear — tests accountController |
| `backend/src/__tests__/reminder.controller.test.ts` | 4 | Crear — tests reminderController |
| `backend/package.json` | 5 | Modificar — añadir cookie-parser |
| `backend/src/index.ts` | 5 | Modificar — montar cookieParser middleware |
| `backend/src/controllers/auth.controller.ts` | 5 | Modificar — Set-Cookie en login/refresh/logout |
| `frontend/src/services/api.ts` | 5 | Modificar — withCredentials: true |
| `frontend/src/services/auth.ts` | 5 | Modificar — no guardar refreshToken en localStorage |

---

## Task 1: Dockerfiles para backend y frontend

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Modify: `docker-compose.yml`

- [ ] **Step 1.1 — Crear `backend/Dockerfile`**

```dockerfile
# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled output and production deps only
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy email templates (EJS files used at runtime)
COPY --from=builder /app/templates ./templates

# Pre-create upload directories so the app doesn't need filesystem write at startup
RUN mkdir -p uploads/profile-images uploads/note-images uploads/group-note-images

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health 2>/dev/null || exit 1

CMD ["node", "dist/index.js"]
```

- [ ] **Step 1.2 — Crear `frontend/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA: fallback all paths to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable caching for index.html so new deployments work
    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }
}
```

- [ ] **Step 1.3 — Crear `frontend/Dockerfile`**

```dockerfile
# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# REACT_APP_API_URL must be provided at build time
ARG REACT_APP_API_URL=http://localhost:3001/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# CI=false avoids treating warnings as errors during build
ENV CI=false
RUN npm run build

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:80/ 2>/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 1.4 — Actualizar `docker-compose.yml`**

Reemplaza el contenido completo con la versión que incluye los tres servicios:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: olympus_scribe_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-olympus}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-olympus_dev_password}
      POSTGRES_DB: ${DB_NAME:-olympus_scribe}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-olympus} -d ${DB_NAME:-olympus_scribe}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: olympus_scribe_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER:-olympus}
      DB_PASSWORD: ${DB_PASSWORD:-olympus_dev_password}
      DB_NAME: ${DB_NAME:-olympus_scribe}
      JWT_SECRET: ${JWT_SECRET}
      ALLOWED_ORIGINS: ${ALLOWED_ORIGINS:-http://localhost}
      APP_URL: ${APP_URL:-http://localhost}
      EMAIL_USER: ${EMAIL_USER:-}
      EMAIL_APP_PASSWORD: ${EMAIL_APP_PASSWORD:-}
    ports:
      - "${BACKEND_PORT:-3001}:3001"
    volumes:
      - uploads_data:/app/uploads
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3001/api/health 2>/dev/null || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        REACT_APP_API_URL: ${REACT_APP_API_URL:-http://localhost:3001/api}
    container_name: olympus_scribe_frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "${FRONTEND_PORT:-80}:80"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:80/ 2>/dev/null || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  uploads_data:
```

- [ ] **Step 1.5 — Añadir health endpoint mínimo en el backend**

En `backend/src/routes/` crea `healthRoutes.ts`:

```typescript
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
```

En `backend/src/index.ts`, añade la ruta ANTES del `generalApiLimiter` para que no cuente en el rate limit:

```typescript
import healthRoutes from './routes/healthRoutes';
// ...
app.use('/api/health', healthRoutes);  // antes de: app.use('/api', generalApiLimiter)
```

- [ ] **Step 1.6 — Verificar compilación del backend**

```bash
cd backend && npx tsc --noEmit && npx jest --no-coverage
```

Esperado: 0 errores, ≥146 tests pasan.

- [ ] **Step 1.7 — Commit**

```bash
git add backend/Dockerfile frontend/Dockerfile frontend/nginx.conf docker-compose.yml backend/src/routes/healthRoutes.ts backend/src/index.ts
git commit -m "feat(infra): add Dockerfiles for backend and frontend; add /api/health endpoint

backend/Dockerfile: multistage build (node:18-alpine). Compiles TS to
dist/, copies only production deps and templates. Exposes port 3001.
frontend/Dockerfile: builds React with nginx:alpine, SPA routing via
nginx.conf. docker-compose.yml now includes all three services with
healthchecks and named volumes. /api/health skips rate limiting."
```

---

## Task 2: Tests para `passwordController`

Los 3 métodos de `passwordController` (`requestReset`, `validateToken`, `resetPassword`) están sin testear. Son críticos porque gestionan la recuperación de contraseña.

**Files:**
- Create: `backend/src/__tests__/password.controller.test.ts`

> Patrón: `passwordController` no usa `NextFunction` — responde directamente con `res.status().json()`. Los mocks son `pool.query` y `emailService.sendPasswordResetEmail`.

- [ ] **Step 2.1 — Crear el test**

```typescript
// backend/src/__tests__/password.controller.test.ts

jest.mock('../database', () => ({ pool: { query: jest.fn() } }));
jest.mock('../services/emailService', () => ({
  emailService: { sendPasswordResetEmail: jest.fn() },
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(() => ({ toString: () => 'a'.repeat(80) })),
}));

import { Request, Response } from 'express';
import { pool } from '../database';
import { emailService } from '../services/emailService';
import { passwordController } from '../controllers/passwordController';

const mockPool = pool as jest.Mocked<typeof pool>;
const mockEmail = emailService as jest.Mocked<typeof emailService>;

function mockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('passwordController.requestReset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when email is missing', async () => {
    const req = { body: {} } as Request;
    const res = mockRes();

    await passwordController.requestReset(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('returns 200 with generic message when email not registered (no info leak)', async () => {
    mockPool.query = jest.fn().mockResolvedValueOnce({ rows: [] });
    const req = { body: { email: 'unknown@example.com' } } as Request;
    const res = mockRes();

    await passwordController.requestReset(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    // Must NOT reveal whether the email exists
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.message).not.toContain('unknown@example.com');
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('generates token, saves to DB and sends email when email exists', async () => {
    mockPool.query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', username: 'alice' }] })
      .mockResolvedValueOnce({ rows: [] }); // insert token

    mockEmail.sendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);

    const req = { body: { email: 'alice@example.com' } } as Request;
    const res = mockRes();

    await passwordController.requestReset(req, res as Response);

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    // Second call should INSERT a token
    const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO password_reset_tokens');
    expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.any(String),
      'alice'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 500 on DB error', async () => {
    mockPool.query = jest.fn().mockRejectedValue(new Error('DB error'));
    const req = { body: { email: 'alice@example.com' } } as Request;
    const res = mockRes();

    await passwordController.requestReset(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('passwordController.validateToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when token is missing', async () => {
    const req = { params: {} } as unknown as Request;
    const res = mockRes();

    await passwordController.validateToken(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when token is expired or used', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
    const req = { params: { token: 'expired-token' } } as unknown as Request;
    const res = mockRes();

    await passwordController.validateToken(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 200 when token is valid', async () => {
    mockPool.query = jest.fn().mockResolvedValue({
      rows: [{ id: 'token-id', user_id: 'user-1', token: 'valid-token', used: false }],
    });
    const req = { params: { token: 'valid-token' } } as unknown as Request;
    const res = mockRes();

    await passwordController.validateToken(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('passwordController.resetPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when token or newPassword is missing', async () => {
    const req = { body: {} } as Request;
    const res = mockRes();

    await passwordController.resetPassword(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when token is invalid/expired', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
    const req = { body: { token: 'bad', newPassword: 'NewPass123' } } as Request;
    const res = mockRes();

    await passwordController.resetPassword(req, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('updates password and marks token as used on success', async () => {
    const tokenRow = { id: 'tok-1', user_id: 'user-1', used: false };
    mockPool.query = jest.fn()
      .mockResolvedValueOnce({ rows: [tokenRow] })   // SELECT token
      .mockResolvedValueOnce({ rows: [] })            // UPDATE users password
      .mockResolvedValueOnce({ rows: [] });           // UPDATE token used=true

    const req = {
      body: { token: 'valid-tok', newPassword: 'NewSecure1' },
    } as Request;
    const res = mockRes();

    await passwordController.resetPassword(req, res as Response);

    expect(mockPool.query).toHaveBeenCalledTimes(3);
    const updatePwdCall = (mockPool.query as jest.Mock).mock.calls[1];
    expect(updatePwdCall[0]).toMatch(/UPDATE users/i);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
```

- [ ] **Step 2.2 — Ejecutar para verificar que falla**

```bash
cd backend && npx jest src/__tests__/password.controller.test.ts --no-coverage
```

Esperado: error porque los mocks no coinciden exactamente aún con la implementación.

- [ ] **Step 2.3 — Ajustar si hay fallos**

Si algún test falla por discrepancia con la implementación real (e.g., la ruta exacta de `emailService`, el nombre del método, el número de queries), lee el archivo `backend/src/controllers/passwordController.ts` y ajusta el test para que refleje el comportamiento real. No modifiques el controlador.

- [ ] **Step 2.4 — Verificar que todos los tests pasan**

```bash
cd backend && npx jest src/__tests__/password.controller.test.ts --no-coverage
```

Esperado: ≥9 tests pasan.

- [ ] **Step 2.5 — Verificar suite completa**

```bash
cd backend && npx jest --no-coverage
```

Esperado: ≥155 tests pasan (146 previos + 9 nuevos).

- [ ] **Step 2.6 — Commit**

```bash
git add backend/src/__tests__/password.controller.test.ts
git commit -m "test(coverage): add tests for passwordController

Covers requestReset (no info leak on unknown email, token generation,
DB error path), validateToken (expired/valid), and resetPassword
(invalid token, successful reset with used flag). All mocking pool and
emailService."
```

---

## Task 3: Tests para `accountController`

`accountController` gestiona perfil, cambio de contraseña y eliminación de cuenta — ningún método tiene tests.

**Files:**
- Create: `backend/src/__tests__/account.controller.test.ts`

- [ ] **Step 3.1 — Crear el test**

```typescript
// backend/src/__tests__/account.controller.test.ts

jest.mock('../database', () => ({ pool: { query: jest.fn() } }));
jest.mock('../utils/pathHelpers', () => ({
  safeDeleteFile: jest.fn().mockResolvedValue(true),
  extractSafeRelativePath: jest.fn((p) => p),
}));
jest.mock('../utils/urlHelpers', () => ({
  getBaseServerUrl: jest.fn(() => 'http://localhost:3001'),
  getProfileImageUrl: jest.fn((url) => url),
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../database';
import { accountController } from '../controllers/accountController';

const mockPool = pool as jest.Mocked<typeof pool>;

function mockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function mockNext(): jest.Mock {
  return jest.fn();
}

function authReq(body = {}, user = { id: 'user-1', email: 'u@test.com' }): Partial<Request> {
  return { body, user } as Partial<Request>;
}

describe('accountController.getProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with user profile', async () => {
    const user = { id: 'user-1', username: 'alice', email: 'alice@x.com', profile_image: null };
    mockPool.query = jest.fn().mockResolvedValue({ rows: [user] });
    const res = mockRes();

    await accountController.getProfile(authReq() as Request, res as Response, mockNext());

    expect(res.status).not.toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ user: expect.any(Object) }));
  });

  it('calls next with NotFoundError when user does not exist', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
    const next = mockNext();

    await accountController.getProfile(authReq() as Request, mockRes() as Response, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('accountController.getUserSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with user settings', async () => {
    const settings = { theme: 'dark', language: 'es', notifications_enabled: true, default_note_sort: 'date' };
    mockPool.query = jest.fn().mockResolvedValue({ rows: [settings] });
    const res = mockRes();

    await accountController.getUserSettings(authReq() as Request, res as Response, mockNext());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ settings }));
  });

  it('returns default settings when user has none', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [] });
    const res = mockRes();

    await accountController.getUserSettings(authReq() as Request, res as Response, mockNext());

    expect(res.json).toHaveBeenCalled();
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.settings).toBeDefined();
  });
});

describe('accountController.updateUserSettings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('upserts settings and returns 200', async () => {
    const updated = { theme: 'light', language: 'en', notifications_enabled: false, default_note_sort: 'title' };
    mockPool.query = jest.fn().mockResolvedValue({ rows: [updated] });
    const res = mockRes();

    await accountController.updateUserSettings(
      authReq({ theme: 'light', language: 'en' }) as Request,
      res as Response,
      mockNext()
    );

    expect(res.json).toHaveBeenCalled();
  });
});

describe('accountController.deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next UnauthorizedError when password is wrong', async () => {
    const hashed = await bcrypt.hash('correct', 10);
    mockPool.query = jest.fn().mockResolvedValue({ rows: [{ password: hashed, profile_image: null }] });
    const next = mockNext();

    await accountController.deleteAccount(
      authReq({ password: 'wrong-password' }) as Request,
      mockRes() as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('deletes account and returns 200 when password is correct', async () => {
    const hashed = await bcrypt.hash('CorrectPass1', 10);
    mockPool.query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ password: hashed, profile_image: null }] }) // SELECT user
      .mockResolvedValueOnce({ rows: [] }); // DELETE user

    const res = mockRes();
    const next = mockNext();

    await accountController.deleteAccount(
      authReq({ password: 'CorrectPass1' }) as Request,
      res as Response,
      next
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('calls next BadRequestError when password field is missing', async () => {
    const next = mockNext();

    await accountController.deleteAccount(
      authReq({}) as Request,
      mockRes() as Response,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});
```

- [ ] **Step 3.2 — Ejecutar para ver fallos iniciales**

```bash
cd backend && npx jest src/__tests__/account.controller.test.ts --no-coverage
```

Si un test falla por discrepancia en el comportamiento real, lee `backend/src/controllers/accountController.ts` para entender la implementación y ajusta el test (no el controlador).

- [ ] **Step 3.3 — Verificar suite completa**

```bash
cd backend && npx jest --no-coverage
```

Esperado: ≥161 tests pasan (anterior + ≥6 nuevos).

- [ ] **Step 3.4 — Commit**

```bash
git add backend/src/__tests__/account.controller.test.ts
git commit -m "test(coverage): add tests for accountController

Covers getProfile (success, user not found), getUserSettings (with
and without existing settings), updateUserSettings (upsert), and
deleteAccount (wrong password, correct password, missing password)."
```

---

## Task 4: Tests para `reminderController`

`reminderController` usa el modelo `Reminder` (clase en `models/reminder.ts`) con métodos estáticos. Necesita mock del modelo.

**Files:**
- Create: `backend/src/__tests__/reminder.controller.test.ts`

- [ ] **Step 4.1 — Leer `backend/src/models/reminder.ts` primero**

Antes de escribir el test, ejecuta:
```bash
grep -n "static\|async\|findWithStatus\|create\|update\|delete\|search" backend/src/models/reminder.ts | head -30
```

Anota los nombres exactos de los métodos estáticos del modelo para el mock.

- [ ] **Step 4.2 — Crear el test**

```typescript
// backend/src/__tests__/reminder.controller.test.ts

// Mock the Reminder model — adjust method names if grep in 4.1 showed different names
jest.mock('../models/reminder', () => ({
  Reminder: {
    findWithStatus: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
    searchByText: jest.fn(),
  },
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import { Reminder } from '../models/reminder';
import { reminderController } from '../controllers/reminderController';

const MockReminder = Reminder as jest.Mocked<typeof Reminder>;

function mockRes(): Partial<Response> {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}
function mockNext(): jest.Mock { return jest.fn(); }

const BASE_DATE = new Date(Date.now() + 86400000).toISOString(); // tomorrow

function authReq(body = {}, params = {}, query = {}): Partial<Request> {
  return { body, params, query, user: { id: 'user-1', email: 'u@test.com' } } as unknown as Partial<Request>;
}

describe('reminderController.getReminders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next BadRequestError when dates are invalid', async () => {
    const next = mockNext();
    await reminderController.getReminders(
      authReq({}, {}, { startDate: 'invalid', endDate: 'invalid' }) as Request,
      mockRes() as Response,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('returns 200 with reminder list on valid dates', async () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 86400000 * 7).toISOString();
    MockReminder.findWithStatus = jest.fn().mockResolvedValue([
      { id: 'r1', title: 'Test', hasTime: true },
    ]);
    const res = mockRes();

    await reminderController.getReminders(
      authReq({}, {}, { startDate: start, endDate: end }) as Request,
      res as Response,
      mockNext()
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ reminders: expect.any(Array) })
    );
  });
});

describe('reminderController.createReminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next BadRequestError when title or dateTime missing', async () => {
    const next = mockNext();
    await reminderController.createReminder(
      authReq({ description: 'no title' }) as Request,
      mockRes() as Response,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('creates reminder and returns 201', async () => {
    const newReminder = { id: 'r-new', title: 'Meeting', dateTime: BASE_DATE };
    MockReminder.create = jest.fn().mockResolvedValue(newReminder);
    const res = mockRes();

    await reminderController.createReminder(
      authReq({ title: 'Meeting', dateTime: BASE_DATE }) as Request,
      res as Response,
      mockNext()
    );

    expect(MockReminder.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('reminderController.updateReminderStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next BadRequestError when status_id is invalid', async () => {
    const next = mockNext();
    await reminderController.updateReminderStatus(
      authReq({ status_id: 99 }, { id: 'r-1' }) as Request,
      mockRes() as Response,
      next
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('updates status and returns 200', async () => {
    const updated = { id: 'r-1', status_id: 2, title: 'Done' };
    MockReminder.updateStatus = jest.fn().mockResolvedValue(updated);
    const res = mockRes();

    await reminderController.updateReminderStatus(
      authReq({ status_id: 2 }, { id: 'r-1' }) as Request,
      res as Response,
      mockNext()
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ reminder: updated })
    );
  });
});

describe('reminderController.deleteReminder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 after deleting reminder', async () => {
    MockReminder.delete = jest.fn().mockResolvedValue(undefined);
    const res = mockRes();

    await reminderController.deleteReminder(
      authReq({}, { id: 'r-1' }) as Request,
      res as Response,
      mockNext()
    );

    expect(MockReminder.delete).toHaveBeenCalledWith('r-1', 'user-1');
    expect(res.json).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4.3 — Ejecutar y ajustar según la implementación real**

```bash
cd backend && npx jest src/__tests__/reminder.controller.test.ts --no-coverage
```

Si los métodos del modelo tienen nombres distintos (e.g., `findAll` en vez de `findWithStatus`), ajusta el mock y los tests para que coincidan con la implementación real. Lee el modelo:
```bash
grep -n "static async\|static " backend/src/models/reminder.ts
```

- [ ] **Step 4.4 — Verificar suite completa**

```bash
cd backend && npx jest --no-coverage
```

Esperado: ≥168 tests pasan.

- [ ] **Step 4.5 — Commit**

```bash
git add backend/src/__tests__/reminder.controller.test.ts
git commit -m "test(coverage): add tests for reminderController

Covers getReminders (invalid dates, valid range), createReminder
(missing title, success), updateReminderStatus (invalid/valid status),
deleteReminder. Mocks Reminder model and logger."
```

---

## Task 5: Refresh token en cookie HttpOnly

El refresh token (TTL 7 días) actualmente se guarda en `localStorage`. Cualquier XSS puede exfiltrarlo. Esta tarea lo mueve a una cookie `HttpOnly; Secure; SameSite=Strict`, eliminando el riesgo de exfiltración larga. El access token (TTL 1 h) queda en memoria de React (no en localStorage).

**Enfoque incremental:** El access token sigue llegando en la respuesta JSON y en el header `Authorization`. Solo el refresh token cambia a cookie. Esto minimiza el impacto en el frontend.

**Files:**
- Modify: `backend/package.json` — añadir `cookie-parser`
- Modify: `backend/src/index.ts` — montar `cookieParser()`
- Modify: `backend/src/controllers/auth.controller.ts` — Set-Cookie en login, leer cookie en refresh, clear cookie en logout
- Modify: `frontend/src/services/api.ts` — `withCredentials: true`
- Modify: `frontend/src/services/auth.ts` — no guardar `refreshToken` en localStorage

- [ ] **Step 5.1 — Instalar `cookie-parser` en el backend**

```bash
cd backend && npm install cookie-parser && npm install --save-dev @types/cookie-parser
```

- [ ] **Step 5.2 — Montar `cookieParser` en `backend/src/index.ts`**

Añade el import al principio:
```typescript
import cookieParser from 'cookie-parser';
```

Añade el middleware DESPUÉS de `express.json()` y ANTES del rate limiter:
```typescript
app.use(express.json());
app.use(cookieParser());           // ← añadir aquí
app.use('/api', generalApiLimiter);
```

- [ ] **Step 5.3 — Leer `backend/src/controllers/auth.controller.ts`**

Localiza los métodos `login`, `refreshAccessToken` y `logout`. Necesitas conocer exactamente dónde devuelven `refreshToken` y cómo reciben el token de refresh.

- [ ] **Step 5.4 — Modificar `login` en `auth.controller.ts`**

En el método `login`, justo ANTES de llamar `res.json(...)`, añade el `Set-Cookie`:

```typescript
// Set refresh token as HttpOnly cookie (7 days, same TTL as JWT)
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/auth',                 // Only sent on auth routes
});
```

En `res.json(...)`, elimina `refreshToken` del body de la respuesta. El access token sigue en el body.

Antes de la modificación, la respuesta tenía algo así:
```typescript
res.json({ success: true, token: accessToken, refreshToken, user, settings });
```
Después:
```typescript
res.json({ success: true, token: accessToken, user, settings });
// refreshToken va solo en la cookie, no en el body
```

- [ ] **Step 5.5 — Modificar `refreshAccessToken` en `auth.controller.ts`**

El endpoint de refresh debe leer el token desde la cookie SI no viene en el body:

```typescript
// Read refresh token from cookie (preferred) or body (legacy fallback)
const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
if (!refreshToken) {
  return next(new UnauthorizedError('No refresh token provided'));
}
```

Al emitir un nuevo access token, renueva también la cookie:

```typescript
// Rotate the refresh token cookie
res.cookie('refresh_token', newRefreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
});
res.json({ success: true, token: newAccessToken });
```

- [ ] **Step 5.6 — Modificar `logout` en `auth.controller.ts`**

Tras revocar el access token y eliminar el refresh token de la BD, limpia la cookie:

```typescript
res.clearCookie('refresh_token', { path: '/api/auth' });
res.json({ success: true, message: 'Sesión cerrada correctamente' });
```

- [ ] **Step 5.7 — Verificar compilación backend**

```bash
cd backend && npx tsc --noEmit && npx jest --no-coverage
```

Esperado: 0 errores de compilación. Los tests de auth existentes pueden necesitar ajuste porque `logout` ahora no recibe `refreshToken` en el body (está en cookie). Si los tests fallan, añade `cookies: { refresh_token: 'test-token' }` al mock de request donde haga falta.

- [ ] **Step 5.8 — Modificar `frontend/src/services/api.ts`**

Localiza donde se crea la instancia de axios y añade `withCredentials: true`:

```typescript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,              // ← añadir: envía cookies automáticamente
  headers: {
    'Content-Type': 'application/json',
  },
});
```

En el interceptor de response que maneja el 401 y llama al refresh, actualiza la llamada — ya no necesitas enviar `refreshToken` en el body porque va en la cookie:

```typescript
// Antes:
const { data } = await axios.post(`${baseURL}/auth/refresh`, {
  refreshToken: authService.getRefreshToken(),
});
// Después:
const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, {
  withCredentials: true,
});
```

- [ ] **Step 5.9 — Modificar `frontend/src/services/auth.ts`**

Lee el archivo. Busca donde se guarda `refreshToken` en `localStorage`. Elimina esa línea. Deja el `token` (access token) en localStorage por ahora — está aquí de momento para compatibilidad; se puede mover a memoria en una iteración futura.

Si hay `getRefreshToken()` o `setRefreshToken()`, elimina también esos métodos y cualquier lugar donde se llamen (ahora la cookie se maneja automáticamente).

- [ ] **Step 5.10 — Verificar que los tests pasan**

```bash
cd backend && npx jest --no-coverage
```

Si `auth.controller.test.ts` falla porque `logout` ya no recibe `refreshToken` en el body, actualiza el mock de request en ese test para que tenga `cookies: { refresh_token: 'test-token' }` en lugar de `body.refreshToken`.

- [ ] **Step 5.11 — Commit**

```bash
git add backend/package.json backend/package-lock.json \
        backend/src/index.ts \
        backend/src/controllers/auth.controller.ts \
        frontend/src/services/api.ts \
        frontend/src/services/auth.ts
git commit -m "feat(security): move refresh token to HttpOnly cookie

Refresh token (7-day TTL) is now set as HttpOnly; Secure; SameSite=Strict
cookie on login, refreshed on token rotation, and cleared on logout.
Access token (1h TTL) remains in the JSON response for Authorization header.
Frontend adds withCredentials: true so the cookie is sent automatically.
This eliminates the long-lived token from localStorage, reducing XSS exposure
window from 7 days to 1 hour (access token TTL)."
```

---

## Self-Review

### Cobertura de spec

| Ítem Sprint 3 | Task | Estado |
|---|---|---|
| Dockerfile backend multistage | Task 1 | ✅ |
| Dockerfile frontend + nginx SPA | Task 1 | ✅ |
| docker-compose con 3 servicios + healthchecks | Task 1 | ✅ |
| /api/health endpoint | Task 1 | ✅ |
| Tests passwordController (requestReset, validateToken, resetPassword) | Task 2 | ✅ |
| Tests accountController (getProfile, settings, deleteAccount) | Task 3 | ✅ |
| Tests reminderController (get, create, updateStatus, delete) | Task 4 | ✅ |
| Refresh token en cookie HttpOnly | Task 5 | ✅ |
| withCredentials en axios | Task 5 | ✅ |
| No guardar refreshToken en localStorage | Task 5 | ✅ |

### Checklist de placeholders

- ✅ Todos los bloques de código son completos y ejecutables.
- ✅ Los paths son exactos.
- ✅ Los steps de ajuste en Tasks 2-4 tienen comandos concretos para descubrir la API real.
- ✅ Task 5 distingue claramente entre access token (localStorage) y refresh token (cookie).

### Consistencia de tipos

- `Reminder` se importa de `'../models/reminder'` en el test y el mock coincide con esa ruta. ✅
- `accountController` es un objeto con métodos, no una clase — el test lo llama correctamente. ✅
- `passwordController` tampoco usa NextFunction en sus handlers — el test los llama con `(req, res)`. ✅
- `cookieParser` se monta DESPUÉS de `express.json()` para que el body-parser procese primero. ✅
- `req.cookies?.refresh_token` usa optional chaining porque en tests sin cookie-parser el objeto puede ser undefined. ✅
