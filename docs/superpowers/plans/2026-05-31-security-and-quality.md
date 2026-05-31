# Security & Quality Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver las 7 vulnerabilidades y mejoras críticas identificadas en el análisis del 2026-05-31, más 6 mejoras de robustez (Sprint 2) y una hoja de ruta (Sprint 3).

**Architecture:** El backend es Express + TypeScript + PostgreSQL (sin ORM). Todas las modificaciones son localizadas: no se introduce ninguna nueva capa ni abstracción más allá de la que ya existe. Sprint 1 no requiere cambios en el frontend.

**Tech Stack:** Node.js 18+, Express 4, TypeScript 5, Zod 3, pg (node-postgres), multer 1.x, jest 29 + supertest.

---

## Mapa de archivos

| Archivo | Sprint | Acción |
|---|---|---|
| `backend/src/config/env.ts` | 1 | Crear — validación Zod de env al arrancar |
| `backend/src/index.ts` | 1 | Modificar — llamar validateEnv + CORS always-on + trust proxy |
| `backend/src/database.ts` | 1 | Modificar — añadir opción ssl |
| `backend/src/middleware/upload.ts` | 1 | Modificar — añadir profileImageUpload, handleMulterError, deleteImage, RequestWithFile |
| `backend/src/config/multerConfig.ts` | 1 | Eliminar |
| `backend/src/config/multerConfigNotes.ts` | 1 | Eliminar |
| `backend/src/config/multerConfigPFP.ts` | 1 | Eliminar |
| `backend/src/routes/accountRoutes.ts` | 1 | Modificar — import desde middleware/upload |
| `backend/src/routes/noteRoutes.ts` | 1 | Modificar — import desde middleware/upload |
| `backend/src/routes/userGroupsRoutes.ts` | 1 | Modificar — import desde middleware/upload |
| `backend/src/controllers/accountController.ts` | 1 | Modificar — import RequestWithFile desde middleware/upload |
| `backend/src/controllers/note/NoteCrudController.ts` | 1 | Modificar — import RequestWithFile desde middleware/upload |
| `backend/src/controllers/usergroup/GroupNoteController.ts` | 1 | Modificar — import limpio desde middleware/upload |
| `backend/src/routes/passwordRoutes.ts` | 1 | Modificar — rate limit en validate-token |
| `.github/workflows/ci.yml` | 1 | Crear — pipeline CI |
| `backend/src/__tests__/config.env.test.ts` | 1 | Crear — tests validateEnv |
| `backend/src/__tests__/middleware.upload.test.ts` | 1 | Crear — tests handleMulterError + deleteImage |
| `backend/src/config/logger.ts` | 2 | Modificar — redactor de campos sensibles |
| `backend/src/utils/cleanupTasks.ts` | 2 | Modificar — logger en vez de console |
| `backend/src/utils/pathHelpers.ts` | 2 | Modificar — logger en vez de console |
| `backend/package.json` | 2 | Modificar — añadir scripts lint/format/typecheck |
| `.husky/pre-commit` | 2 | Crear — pre-commit hook |
| `backend/.eslintrc.js` | 2 | Ajustar — añadir regla no-console |

---

## SPRINT 1 — Bloqueantes de seguridad (semana 1-2)

---

### Task 1: Validación de variables de entorno en startup

**Por qué:** El servidor arranca aunque falten `JWT_SECRET` o `DB_PASSWORD`. El error solo aparece en la primera request, enmascarando despliegues rotos.

**Files:**
- Create: `backend/src/config/env.ts`
- Modify: `backend/src/index.ts` (líneas 1-24, añadir llamada tras dotenv.config)
- Test: `backend/src/__tests__/config.env.test.ts`

- [ ] **Step 1.1 — Escribir el test que falla**

```typescript
// backend/src/__tests__/config.env.test.ts
describe('validateEnv', () => {
  const original = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('throws when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_NAME = 'db';

    const { validateEnv } = require('../config/env');
    expect(() => validateEnv()).toThrow('JWT_SECRET');
  });

  it('throws when JWT_SECRET is shorter than 32 chars', () => {
    process.env.JWT_SECRET = 'tooshort';
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'u';
    process.env.DB_PASSWORD = 'p';
    process.env.DB_NAME = 'db';

    const { validateEnv } = require('../config/env');
    expect(() => validateEnv()).toThrow('32');
  });

  it('returns parsed config when all required vars are present', () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'user';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_NAME = 'mydb';
    process.env.DB_PORT = '5432';
    process.env.NODE_ENV = 'test';

    const { validateEnv } = require('../config/env');
    const result = validateEnv();

    expect(result.JWT_SECRET).toHaveLength(32);
    expect(result.DB_PORT).toBe(5432);          // coercionado a number
    expect(result.NODE_ENV).toBe('test');
    expect(result.PORT).toBe(3001);              // default
  });

  it('throws with readable message listing all missing vars', () => {
    delete process.env.JWT_SECRET;
    delete process.env.DB_HOST;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;

    const { validateEnv } = require('../config/env');
    expect(() => validateEnv()).toThrow('Invalid environment variables');
  });
});
```

- [ ] **Step 1.2 — Verificar que el test falla**

```bash
cd backend && npx jest src/__tests__/config.env.test.ts --no-coverage
```

Resultado esperado: `Cannot find module '../config/env'`

- [ ] **Step 1.3 — Implementar `backend/src/config/env.ts`**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DB_HOST: z.string().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD is required'),
  DB_NAME: z.string().min(1, 'DB_NAME is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  FRONTEND_URL: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  APP_URL: z.string().optional(),
  APP_URL_2: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_APP_PASSWORD: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(): AppEnv {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${errors}`);
  }
  return result.data;
}
```

- [ ] **Step 1.4 — Verificar que el test pasa**

```bash
cd backend && npx jest src/__tests__/config.env.test.ts --no-coverage
```

Resultado esperado: `4 passed`

- [ ] **Step 1.5 — Añadir la llamada en `backend/src/index.ts`**

Justo debajo de la línea `dotenv.config();` (línea 24), insertar:

```typescript
// Validate environment variables before starting the server
if (process.env.NODE_ENV !== 'test') {
  const { validateEnv } = require('./config/env');
  try {
    validateEnv();
  } catch (err) {
    console.error('\n[STARTUP ERROR] Configuración de entorno inválida:');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
```

- [ ] **Step 1.6 — Correr la suite completa para verificar que no hay regresiones**

```bash
cd backend && npx jest --no-coverage
```

Resultado esperado: todos los tests previos siguen pasando.

- [ ] **Step 1.7 — Commit**

```bash
git add backend/src/config/env.ts backend/src/index.ts backend/src/__tests__/config.env.test.ts
git commit -m "feat(security): validate required env vars at startup

Adds Zod schema that validates DB_*, JWT_SECRET (>=32 chars) and
LOG_LEVEL before the server starts. Server exits with readable error
message if any required variable is absent or malformed.
Guard skipped in test environment."
```

---

### Task 2: TLS en la conexión a PostgreSQL

**Por qué:** Sin `ssl: true`, credenciales y datos viajan en texto claro si el backend y la BD están en redes separadas (producción habitual).

**Files:**
- Modify: `backend/src/database.ts`

No hay test unitario posible sin instancia real de PostgreSQL; el efecto se verifica con un healthcheck en CI. Lo que sí podemos testear es que el pool se configura con ssl cuando NODE_ENV es production.

- [ ] **Step 2.1 — Modificar `backend/src/database.ts`**

Reemplazar el contenido completo:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // Enable SSL in production; disable in development/test to simplify local setup
  ssl: isProduction ? { rejectUnauthorized: true } : false,
  // Pool tuning
  max: parseInt(process.env.PG_POOL_MAX || '10'),
  idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.PG_CONN_TIMEOUT || '2000'),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.connect((err, _client, release) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    return;
  }
  release();
});
```

- [ ] **Step 2.2 — Verificar que los tests existentes siguen pasando**

```bash
cd backend && npx jest --no-coverage
```

Resultado esperado: mismo resultado que antes (pool está mockeado en todos los tests).

- [ ] **Step 2.3 — Documentar la variable de entorno en `.env.example`**

Añadir al final de `backend/.env.example`:

```env
# PostgreSQL pool tuning (optional)
PG_POOL_MAX=10
PG_IDLE_TIMEOUT=30000
PG_CONN_TIMEOUT=2000
```

- [ ] **Step 2.4 — Commit**

```bash
git add backend/src/database.ts backend/.env.example
git commit -m "feat(security): enable TLS for PostgreSQL in production

Adds ssl: { rejectUnauthorized: true } when NODE_ENV=production.
Also adds optional pool tuning via PG_POOL_MAX, PG_IDLE_TIMEOUT,
PG_CONN_TIMEOUT with safe defaults."
```

---

### Task 3: CORS siempre activo con whitelist configurable

**Por qué:** Actualmente CORS solo se configura en desarrollo. Si el deploy de producción no tiene Nginx configurado correctamente, cualquier origen puede llamar a la API.

**Files:**
- Modify: `backend/src/index.ts` (bloque de CORS, líneas 72-78)
- Modify: `backend/.env.example` (nueva variable ALLOWED_ORIGINS)

- [ ] **Step 3.1 — Reemplazar el bloque CORS en `backend/src/index.ts`**

Eliminar las líneas 72-78 (el bloque `if (process.env.NODE_ENV !== 'production')`) y sustituir por:

```typescript
// CORS: always active; allowed origins controlled by ALLOWED_ORIGINS env var
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o: string) => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests without Origin header (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" not in allowed list`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

- [ ] **Step 3.2 — Añadir `ALLOWED_ORIGINS` a `.env.example`**

```env
# CORS: comma-separated list of allowed origins (overrides FRONTEND_URL if set)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

- [ ] **Step 3.3 — Verificar que los tests pasan**

```bash
cd backend && npx jest --no-coverage
```

Resultado esperado: sin cambios en los tests (CORS no afecta a los unit tests porque mockeamos el pool y no iniciamos el servidor completo).

- [ ] **Step 3.4 — Commit**

```bash
git add backend/src/index.ts backend/.env.example
git commit -m "fix(security): apply CORS policy in all environments

Removes the NODE_ENV guard that skipped CORS in production.
Whitelist is read from ALLOWED_ORIGINS (comma-separated) or
FRONTEND_URL. Malformed origins get a descriptive error.
Always-active CORS prevents silent misconfiguration in production."
```

---

### Task 4: Consolidar multer y corregir path traversal en deleteImage

**Por qué:** Existen 3 configuraciones de multer legacy (`multerConfig.ts`, `multerConfigNotes.ts`, `multerConfigPFP.ts`) que usan `path.extname(file.originalname)` para el nombre de archivo — si un cliente falsifica `Content-Type`, la extensión del archivo queda controlada por el atacante. Además, `deleteImage` en las configs legacy no valida el path, permitiendo un path traversal.

El módulo seguro ya existe en `middleware/upload.ts` (usa MIME→ext map). Esta tarea lo extiende y elimina los módulos inseguros.

**Files:**
- Modify: `backend/src/middleware/upload.ts` (añadir profileImageUpload, handleMulterError, deleteImage, RequestWithFile)
- Modify: `backend/src/routes/accountRoutes.ts`
- Modify: `backend/src/routes/noteRoutes.ts`
- Modify: `backend/src/routes/userGroupsRoutes.ts`
- Modify: `backend/src/controllers/accountController.ts`
- Modify: `backend/src/controllers/note/NoteCrudController.ts`
- Modify: `backend/src/controllers/usergroup/GroupNoteController.ts`
- Delete: `backend/src/config/multerConfig.ts`
- Delete: `backend/src/config/multerConfigNotes.ts`
- Delete: `backend/src/config/multerConfigPFP.ts`
- Test: `backend/src/__tests__/middleware.upload.test.ts`

- [ ] **Step 4.1 — Escribir el test que falla**

```typescript
// backend/src/__tests__/middleware.upload.test.ts
import { Request, Response, NextFunction } from 'express';

// Mock dependencies before importing the module under test
jest.mock('../utils/pathHelpers', () => ({
  safeDeleteFile: jest.fn(),
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  log: { auth: jest.fn(), security: jest.fn(), db: jest.fn(), failure: jest.fn() },
}));

import * as pathHelpers from '../utils/pathHelpers';

// Import after mocks are set up
let handleMulterError: (err: Error, req: Request, res: Response, next: NextFunction) => void;
let deleteImage: (imageUrl: string) => Promise<void>;

beforeAll(async () => {
  const mod = await import('../middleware/upload');
  handleMulterError = mod.handleMulterError;
  deleteImage = mod.deleteImage;
});

describe('handleMulterError', () => {
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('returns 400 with file-size message on LIMIT_FILE_SIZE', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const err = new multer.MulterError('LIMIT_FILE_SIZE');

    handleMulterError(err, {} as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('25MB') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with generic message on other MulterErrors', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const multer = require('multer');
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE');

    handleMulterError(err, {} as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with err.message for non-Multer errors', () => {
    const err = new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP');

    handleMulterError(err, {} as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Solo se permiten imágenes JPEG, PNG, GIF y WEBP' });
  });

  it('calls next() when err is null/undefined', () => {
    handleMulterError(null as any, {} as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('deleteImage', () => {
  const mockSafeDelete = pathHelpers.safeDeleteFile as jest.Mock;

  beforeEach(() => {
    mockSafeDelete.mockReset();
  });

  it('calls safeDeleteFile with the relative path (no leading slash)', async () => {
    mockSafeDelete.mockResolvedValue(true);

    await deleteImage('/note-images/test-123.jpg');

    expect(mockSafeDelete).toHaveBeenCalledTimes(1);
    const [filePath] = mockSafeDelete.mock.calls[0];
    expect(filePath).toBe('note-images/test-123.jpg');
    expect(filePath).not.toContain('..');
  });

  it('does not throw when safeDeleteFile returns false (unsafe path)', async () => {
    mockSafeDelete.mockResolvedValue(false);

    await expect(deleteImage('../../../etc/passwd')).resolves.not.toThrow();
  });

  it('does not throw when safeDeleteFile rejects', async () => {
    mockSafeDelete.mockRejectedValue(new Error('disk error'));

    await expect(deleteImage('/note-images/x.jpg')).resolves.not.toThrow();
  });
});
```

- [ ] **Step 4.2 — Verificar que el test falla**

```bash
cd backend && npx jest src/__tests__/middleware.upload.test.ts --no-coverage
```

Resultado esperado: `handleMulterError is not a function` o similar (aún no exportado).

- [ ] **Step 4.3 — Actualizar `backend/src/middleware/upload.ts` con los nuevos exports**

Reemplazar el contenido completo del archivo:

```typescript
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { safeDeleteFile } from '../utils/pathHelpers';
import { logger } from '../config/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maps MIME types to safe file extensions. Extension is never taken from originalname. */
const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (Object.keys(ALLOWED_MIME_TO_EXT).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPEG, PNG, GIF y WEBP'));
  }
};

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Storage: notes and group notes (routed by request URL) ───────────────────

const noteStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = req.originalUrl.includes('/user-groups')
      ? path.join(UPLOADS_DIR, 'group-note-images')
      : path.join(UPLOADS_DIR, 'note-images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || '.bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

/** Multer instance for note images and group note images (destination by URL). */
export const upload = multer({
  storage: noteStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

// ─── Storage: profile images ──────────────────────────────────────────────────

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'profile-images');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TO_EXT[file.mimetype] || '.bin';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

/** Multer instance for profile images. */
export const profileImageUpload = multer({
  storage: profileStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: imageFileFilter,
});

// ─── Middleware: multer error handler ─────────────────────────────────────────

export const handleMulterError = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 25MB' });
      return;
    }
    res.status(400).json({ error: 'Error al subir el archivo' });
    return;
  }
  if (err) {
    res.status(400).json({ error: err.message });
    return;
  }
  next();
};

// ─── Utility: safe image deletion ─────────────────────────────────────────────

/**
 * Safely deletes an uploaded image.
 * imageUrl is the value stored in the DB, e.g. "/note-images/abc.jpg".
 * Uses safeDeleteFile to prevent path traversal.
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Remove leading slash so path.resolve works correctly inside safeDeleteFile
    const relativePath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    const deleted = await safeDeleteFile(relativePath, UPLOADS_DIR);
    if (!deleted) {
      logger.warn('No se pudo eliminar imagen (ruta insegura o archivo no encontrado)', { imageUrl });
    }
  } catch (err) {
    logger.error('Error inesperado al eliminar imagen', { imageUrl, err });
  }
};
```

- [ ] **Step 4.4 — Verificar que el nuevo test pasa**

```bash
cd backend && npx jest src/__tests__/middleware.upload.test.ts --no-coverage
```

Resultado esperado: `7 passed`

- [ ] **Step 4.5 — Actualizar `backend/src/routes/noteRoutes.ts`**

Cambiar línea 5:

```typescript
// Antes:
import { handleMulterError } from '../config/multerConfigNotes';

// Después:
import { handleMulterError } from '../middleware/upload';
```

- [ ] **Step 4.6 — Actualizar `backend/src/routes/userGroupsRoutes.ts`**

Cambiar línea 5:

```typescript
// Antes:
import { handleMulterError } from '../config/multerConfigNotes';

// Después:
import { handleMulterError } from '../middleware/upload';
```

- [ ] **Step 4.7 — Actualizar `backend/src/routes/accountRoutes.ts`**

Cambiar línea 4:

```typescript
// Antes:
import { upload } from '../config/multerConfigPFP';

// Después:
import { profileImageUpload } from '../middleware/upload';
```

Cambiar línea 41: `upload.single('image')` → `profileImageUpload.single('image')`

- [ ] **Step 4.8 — Actualizar `backend/src/controllers/accountController.ts`**

Cambiar línea 11:

```typescript
// Antes:
import { RequestWithFile } from "../config/multerConfig";

// Después:
import { RequestWithFile } from "../middleware/upload";
```

- [ ] **Step 4.9 — Actualizar `backend/src/controllers/note/NoteCrudController.ts`**

Cambiar línea 5:

```typescript
// Antes:
import { RequestWithFile } from "../../config/multerConfig";

// Después:
import { RequestWithFile } from "../../middleware/upload";
```

- [ ] **Step 4.10 — Actualizar `backend/src/controllers/usergroup/GroupNoteController.ts`**

Cambiar línea 5 (los 4 imports eran de multerConfig pero solo RequestWithFile se usa en el cuerpo):

```typescript
// Antes:
import { groupNoteImageUpload, deleteImage, handleMulterError, RequestWithFile } from "../../config/multerConfig";

// Después:
import { RequestWithFile } from "../../middleware/upload";
```

- [ ] **Step 4.11 — Eliminar los 3 archivos legacy**

```bash
cd backend && rm src/config/multerConfig.ts src/config/multerConfigNotes.ts src/config/multerConfigPFP.ts
```

- [ ] **Step 4.12 — Verificar que todo el backend compila y los tests pasan**

```bash
cd backend && npx tsc --noEmit && npx jest --no-coverage
```

Resultado esperado: 0 errores de compilación, todos los tests pasan.

- [ ] **Step 4.13 — Commit**

```bash
git add backend/src/middleware/upload.ts \
        backend/src/routes/accountRoutes.ts \
        backend/src/routes/noteRoutes.ts \
        backend/src/routes/userGroupsRoutes.ts \
        backend/src/controllers/accountController.ts \
        backend/src/controllers/note/NoteCrudController.ts \
        backend/src/controllers/usergroup/GroupNoteController.ts \
        backend/src/__tests__/middleware.upload.test.ts
git rm backend/src/config/multerConfig.ts \
       backend/src/config/multerConfigNotes.ts \
       backend/src/config/multerConfigPFP.ts
git commit -m "fix(security): consolidate multer; fix path traversal in deleteImage

Removes three legacy multer configs that derived file extension from
client-controlled originalname. All uploads now go through
middleware/upload.ts which maps MIME type to extension.
Adds profileImageUpload, handleMulterError, and deleteImage exports.
deleteImage uses safeDeleteFile() to prevent path traversal.
Updates all routes and controllers to import from the single module."
```

---

### Task 5: Rate limit en `GET /api/password/validate-token/:token`

**Por qué:** El endpoint que comprueba si un token de reset es válido no tiene rate limit. Un atacante puede intentar tokens de forma silenciosa sin límite temporal.

**Files:**
- Modify: `backend/src/routes/passwordRoutes.ts`

- [ ] **Step 5.1 — Modificar `backend/src/routes/passwordRoutes.ts`**

Añadir `passwordResetLimiter` al endpoint `validate-token`:

```typescript
import express from 'express';
import { passwordController } from '../controllers/passwordController';
import { passwordResetLimiter, passwordResetConfirmLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { requestResetSchema, resetPasswordSchema } from '../validation/schemas/user.schema';

const router = express.Router();

router.post(
  '/request-reset',
  passwordResetLimiter,
  validate(requestResetSchema),
  passwordController.requestReset
);

// Apply the same rate limit as request-reset to prevent silent token enumeration
router.get(
  '/validate-token/:token',
  passwordResetLimiter,
  passwordController.validateToken
);

router.post(
  '/reset',
  passwordResetConfirmLimiter,
  validate(resetPasswordSchema),
  passwordController.resetPassword
);

export default router;
```

- [ ] **Step 5.2 — Verificar que los tests existentes pasan**

```bash
cd backend && npx jest --no-coverage
```

Resultado esperado: sin cambios en resultados.

- [ ] **Step 5.3 — Commit**

```bash
git add backend/src/routes/passwordRoutes.ts
git commit -m "fix(security): rate-limit GET /password/validate-token

Applies passwordResetLimiter (3 req / 15 min / IP) to the token
validation endpoint, same as /request-reset. Prevents silent
enumeration of password reset tokens in production."
```

---

### Task 6: Pipeline CI con GitHub Actions

**Por qué:** Sin CI, nadie valida que los tests pasen antes de mergear. Es la red de seguridad más importante.

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 6.1 — Crear `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, rodrigo, develop]
  pull_request:
    branches: [main]

jobs:
  backend:
    name: Backend — lint, typecheck, test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: backend

      - name: Run tests with coverage
        run: npx jest --coverage --passWithNoTests
        working-directory: backend
        env:
          NODE_ENV: test
          JWT_SECRET: test-jwt-secret-key-for-ci-pipeline-only
          DB_HOST: localhost
          DB_USER: test
          DB_PASSWORD: test
          DB_NAME: test

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: backend-coverage
          path: backend/coverage/
          retention-days: 7

  frontend:
    name: Frontend — test, build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Run tests
        run: npx react-scripts test --watchAll=false --passWithNoTests --ci
        working-directory: frontend
        env:
          CI: true
          REACT_APP_API_URL: http://localhost:3001/api

      - name: Build
        run: npm run build
        working-directory: frontend
        env:
          CI: false
          REACT_APP_API_URL: http://localhost:3001/api
```

- [ ] **Step 6.2 — Crear el directorio si no existe**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 6.3 — Commit y push para disparar el workflow**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline for backend and frontend

Runs on push to main/rodrigo/develop and on PRs to main.
Backend: jest with coverage + artifact upload.
Frontend: react-scripts test + build.
All jobs use Node 18 with npm cache."
```

- [ ] **Step 6.4 — Verificar en GitHub que el workflow se dispara y pasa**

Abrir `https://github.com/<usuario>/<repo>/actions` y confirmar que el job verde aparece en el commit.

---

## SPRINT 2 — Robustez y calidad (semana 2-4)

> Sprint 2 comienza una vez que Sprint 1 esté mergeado y todos los workflows pasen.

---

### Task 7: Redacción de campos sensibles en logs (Winston)

**Por qué:** Si un controller pasa por error un payload con `password` o `JWT_SECRET`, Winston lo graba sin censurar.

**Files:**
- Modify: `backend/src/config/logger.ts`

- [ ] **Step 7.1 — Añadir formato `redactSensitive` en `logger.ts`**

Antes de `createLogger`, añadir:

```typescript
const SENSITIVE_KEYS = ['password', 'currentPassword', 'newPassword', 'token',
  'accessToken', 'refreshToken', 'authorization', 'JWT_SECRET', 'EMAIL_APP_PASSWORD'];

const redactSensitive = winston.format((info) => {
  const redact = (obj: Record<string, unknown>): void => {
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redact(obj[key] as Record<string, unknown>);
      }
    }
  };
  redact(info as unknown as Record<string, unknown>);
  return info;
});
```

Añadir `redactSensitive()` al array de formats antes de `printf`/`json`.

- [ ] **Step 7.2 — Reemplazar `console.*` por `logger.*` en todos los archivos identificados**

Archivos con `console.error` o `console.warn` fuera de tests:
- `backend/src/database.ts` (línea `pool.on('error', ...)` y `pool.connect(...)`)
- `backend/src/utils/pathHelpers.ts` (varios `console.warn`)
- `backend/src/middleware/upload.ts` (si quedara alguno)

Patrón de reemplazo:
```typescript
// Antes:
console.error('message', error);
console.warn('message', context);

// Después:
logger.error('message', { error });
logger.warn('message', { context });
```

- [ ] **Step 7.3 — Test**

```bash
cd backend && npx jest --no-coverage
```

Resultado esperado: todos los tests pasan (los mocks de logger ya están en setup).

- [ ] **Step 7.4 — Commit**

```bash
git add backend/src/config/logger.ts backend/src/database.ts backend/src/utils/pathHelpers.ts
git commit -m "fix(security): redact sensitive fields in logs; replace console.* with logger

Adds Winston format that replaces password/token/JWT fields with
[REDACTED] in all log levels. Replaces console.error/warn calls
outside tests with the structured logger."
```

---

### Task 8: `app.set('trust proxy', 1)` — IPs reales detrás de Nginx

**Por qué:** Rate limiter usa `req.ip`. Sin trust proxy, la IP es la de Nginx, no la del cliente.

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 8.1 — Añadir trust proxy en `index.ts`**

Inmediatamente después de `const app = express();`:

```typescript
// Trust the first proxy (Nginx/load balancer) to get real client IP
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

- [ ] **Step 8.2 — Commit**

```bash
git add backend/src/index.ts
git commit -m "fix(security): set trust proxy=1 in production for correct client IP

Allows express-rate-limit to use the real client IP from
X-Forwarded-For instead of the proxy IP when behind Nginx."
```

---

### Task 9: Adoptar `asyncHandler` en todas las rutas

**Por qué:** Si un controller async lanza una excepción sin `try/catch`, Express 4 no la captura y el proceso puede colgarse.

**Files:**
- Modify: `backend/src/middleware/errorHandler.ts` (verificar que asyncHandler existe — ya existe en línea 135)
- Modify: `backend/src/routes/noteRoutes.ts`, `accountRoutes.ts`, `userGroupsRoutes.ts`, `noteGroupRoutes.ts`, `passwordRoutes.ts`, `auth.ts` (añadir asyncHandler en todos los `router.method(...)`)

- [ ] **Step 9.1 — Verificar que `asyncHandler` existe en errorHandler.ts**

```bash
grep -n "asyncHandler" backend/src/middleware/errorHandler.ts
```

Si no existe, añadir:

```typescript
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

- [ ] **Step 9.2 — Envolver los handlers en `noteRoutes.ts` como ejemplo**

```typescript
import { asyncHandler } from '../middleware/errorHandler';

router.post('/', validate(createNoteSchema), asyncHandler(noteController.createNote.bind(noteController)));
router.get('/', asyncHandler(noteController.getNotes.bind(noteController)));
// ... mismo patrón para el resto
```

Repetir el mismo patrón en los demás routers.

- [ ] **Step 9.3 — Verificar compilación y tests**

```bash
cd backend && npx tsc --noEmit && npx jest --no-coverage
```

- [ ] **Step 9.4 — Commit**

```bash
git add backend/src/routes/
git commit -m "fix(reliability): wrap all route handlers with asyncHandler

Ensures that uncaught promise rejections in controller async functions
are forwarded to the centralized error handler (errorHandler.ts)
instead of hanging the request or crashing the process."
```

---

### Task 10: Graceful shutdown y cancelar intervalos

**Por qué:** Sin handlers de SIGTERM, el pool de PostgreSQL no se cierra limpiamente y las tareas programadas quedan en estado desconocido.

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 10.1 — Añadir graceful shutdown en `index.ts`**

Después de `app.listen(...)`:

```typescript
const cleanupIntervalId = setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

async function shutdown(signal: string): Promise<void> {
  logger.info(`Señal ${signal} recibida. Cerrando servidor...`);
  clearInterval(cleanupIntervalId);
  try {
    await pool.end();
    logger.info('Pool de PostgreSQL cerrado correctamente.');
  } catch (err) {
    logger.error('Error al cerrar pool', { err });
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

Eliminar el `setInterval(cleanupExpiredTokens, ...)` que ya existe y sustituirlo por la variable `cleanupIntervalId`.

- [ ] **Step 10.2 — Commit**

```bash
git add backend/src/index.ts
git commit -m "fix(reliability): add graceful shutdown on SIGTERM/SIGINT

Clears the cleanup interval and drains the PostgreSQL pool before
exiting. Prevents resource leaks and allows orchestrators (Docker,
PM2, Kubernetes) to restart cleanly."
```

---

### Task 11: Migración de BD — CASCADE e índice en `note_groups`

**Por qué:** `note_groups.user_id` no tiene `ON DELETE CASCADE` ni índice. Al borrar usuarios quedan filas huérfanas; las queries por `user_id` hacen full scan.

**Files:**
- Create: `backend/migrations/002_note_groups_fk_index.sql`
- Modify: `docker/postgres/init/01_schema.sql` (sincronizar)

- [ ] **Step 11.1 — Crear la migración**

```sql
-- backend/migrations/002_note_groups_fk_index.sql
-- Fix missing ON DELETE CASCADE and index on note_groups.user_id

BEGIN;

-- Drop the existing FK without cascade
ALTER TABLE note_groups
  DROP CONSTRAINT IF EXISTS note_groups_user_id_fkey;

-- Re-add FK with cascade delete
ALTER TABLE note_groups
  ADD CONSTRAINT note_groups_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add missing index for performance
CREATE INDEX IF NOT EXISTS idx_note_groups_user_id ON note_groups(user_id);

COMMIT;
```

- [ ] **Step 11.2 — Aplicar la migración a la BD local**

```bash
psql -U $DB_USER -d $DB_NAME -f backend/migrations/002_note_groups_fk_index.sql
```

o con Docker:

```bash
docker exec -i olympus_scribe_db psql -U olympus -d olympus_scribe < backend/migrations/002_note_groups_fk_index.sql
```

- [ ] **Step 11.3 — Sincronizar `docker/postgres/init/01_schema.sql`**

En la definición de `note_groups`, cambiar:

```sql
-- Antes:
user_id UUID REFERENCES users(id),

-- Después:
user_id UUID REFERENCES users(id) ON DELETE CASCADE,
```

Y añadir al bloque de índices:

```sql
CREATE INDEX IF NOT EXISTS idx_note_groups_user_id ON note_groups(user_id);
```

- [ ] **Step 11.4 — Commit**

```bash
git add backend/migrations/002_note_groups_fk_index.sql docker/postgres/init/01_schema.sql
git commit -m "fix(db): add ON DELETE CASCADE and index to note_groups.user_id

Without CASCADE, deleting a user left orphaned note_groups rows.
Without index, queries by user_id did a full table scan.
Migration 002 applies both fixes to existing databases."
```

---

### Task 12: Scripts npm de calidad + pre-commit hook

**Por qué:** ESLint y Prettier están configurados pero no tienen scripts; nadie los ejecuta. Sin pre-commit, el código sucio llega al repo.

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Create: `.husky/pre-commit`

- [ ] **Step 12.1 — Añadir scripts en `backend/package.json`**

En la sección `"scripts"`, añadir:

```json
"lint": "eslint . --ext .ts",
"lint:fix": "eslint . --ext .ts --fix",
"format": "prettier --write .",
"format:check": "prettier --check .",
"typecheck": "tsc --noEmit",
"test:ci": "jest --coverage --passWithNoTests"
```

- [ ] **Step 12.2 — Añadir scripts en `frontend/package.json`**

```json
"lint": "react-scripts lint || eslint src --ext .ts,.tsx",
"format": "prettier --write src/",
"format:check": "prettier --check src/",
"typecheck": "tsc --noEmit",
"test:ci": "react-scripts test --watchAll=false --passWithNoTests --ci"
```

- [ ] **Step 12.3 — Instalar Husky y lint-staged en la raíz del repo**

```bash
cd .. # en la raíz del repositorio
npm install --save-dev husky lint-staged
npx husky install
```

- [ ] **Step 12.4 — Configurar lint-staged en `package.json` raíz**

Si no existe `package.json` en la raíz con scripts, crear uno mínimo. Añadir:

```json
{
  "scripts": {
    "prepare": "husky install"
  },
  "lint-staged": {
    "backend/src/**/*.ts": [
      "cd backend && npx eslint --fix",
      "cd backend && npx prettier --write"
    ],
    "frontend/src/**/*.{ts,tsx}": [
      "cd frontend && npx prettier --write"
    ]
  }
}
```

- [ ] **Step 12.5 — Crear el pre-commit hook**

```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

- [ ] **Step 12.6 — Verificar que el hook funciona**

```bash
git add backend/package.json frontend/package.json .husky/pre-commit
git commit -m "chore: add npm quality scripts and pre-commit hook

Adds lint, lint:fix, format, format:check, typecheck and test:ci
scripts to backend and frontend package.json.
Installs Husky + lint-staged to enforce formatting on commit."
```

---

## SPRINT 3 — Plataforma (semana 4-8) [Roadmap]

> Sprint 3 requiere un plan propio por su mayor complejidad. Los ítems aquí son descripciones de alto nivel; antes de ejecutarlos, correr `superpowers:writing-plans` con el spec correspondiente.

### Task 13: JWT → cookies `HttpOnly` (Sprint 3A)

Reemplazar localStorage por cookie `HttpOnly; Secure; SameSite=Strict`.

**Cambios necesarios:**
- Backend: en login, emitir `Set-Cookie` en lugar de JSON body con tokens; añadir `cookie-parser`; añadir CSRF doble-submit (cabecera `X-CSRF-Token`).
- Frontend: eliminar lectura/escritura de localStorage; el interceptor de axios debe enviar la cookie automáticamente (`withCredentials: true`); migrar logout a endpoint DELETE que borre la cookie.

**Complejidad:** Alta (afecta a auth.controller, middleware/auth, api.ts, AuthContext, todos los tests).

### Task 14: Dockerfiles para backend y frontend (Sprint 3B)

- `backend/Dockerfile` — multistage: `node:18-alpine` build + runtime.
- `frontend/Dockerfile` — build + `nginx:alpine` para servir estáticos.
- Actualizar `docker-compose.yml` para incluir los tres servicios (postgres, backend, frontend) con healthchecks y volúmenes.
- Variables de entorno documentadas en `.env.docker.example`.

### Task 15: Sistema de migraciones con `node-pg-migrate` (Sprint 3C)

- Instalar `node-pg-migrate`.
- Convertir `database.sql` + `001_add_token_tables.sql` + `002_note_groups_fk_index.sql` a migraciones versionadas.
- Añadir script `npm run db:migrate` y ejecutarlo en el arranque o CI.
- Eliminar `docker/postgres/init/01_schema.sql` (reemplazado por migraciones).

### Task 16: Cobertura ≥ 50 % en backend y Playwright e2e (Sprint 3D)

- Añadir tests para: `reminderController`, `passwordController`, `accountController`, `GroupNoteController` (CRUD completo).
- Configurar `thresholds` en `jest.config.js`:
  ```js
  coverageThreshold: { global: { statements: 50, branches: 40 } }
  ```
- Instalar Playwright y añadir 5 flujos críticos: registro, login, crear nota, compartir nota, reset password.
- Ejecutar en CI contra BD Docker real (GitHub Actions `services: postgres`).

---

## Self-Review del plan

### Cobertura de spec (pending-tasks.md §10)

| Ítem | Sprint | Task | Estado |
|---|---|---|---|
| 1.1 TLS en PostgreSQL | 1 | Task 2 | ✅ |
| 1.2 JWT_SECRET en startup | 1 | Task 1 | ✅ |
| 1.3 CORS en producción | 1 | Task 3 | ✅ |
| 1.4 + 9.1 Multer legacy + path traversal | 1 | Task 4 | ✅ |
| 1.5 deleteImage path traversal | 1 | Task 4 (incluido) | ✅ |
| 1.6 Rate limit validate-token | 1 | Task 5 | ✅ |
| 6.1 GitHub Actions CI | 1 | Task 6 | ✅ |
| 1.10 Redacción sensibles en logs | 2 | Task 7 | ✅ |
| 1.12 trust proxy | 2 | Task 8 | ✅ |
| 3.5 asyncHandler | 2 | Task 9 | ✅ |
| 3.6/3.7 Shutdown hooks | 2 | Task 10 | ✅ |
| 4.1/4.2 Migración BD note_groups | 2 | Task 11 | ✅ |
| 6.7/6.8 Scripts + Husky | 2 | Task 12 | ✅ |
| 2.1/2.2 JWT cookies | 3 | Task 13 | 📋 Roadmap |
| 5.1 Dockerfiles | 3 | Task 14 | 📋 Roadmap |
| 4.3 Migraciones versionadas | 3 | Task 15 | 📋 Roadmap |
| 6.2/6.4 Tests coverage | 3 | Task 16 | 📋 Roadmap |

### Checklist de placeholders

- ✅ Todos los pasos de código contienen código real, no "implement later".
- ✅ Los paths son exactos y verificados contra el repo.
- ✅ Los imports coinciden con los exports definidos en las mismas tareas.
- ✅ Los tests contienen assertions concretas, no "assert something".
- ✅ Los comandos de git incluyen los archivos exactos.

### Consistencia de tipos

- `RequestWithFile` se define en `middleware/upload.ts` (Task 4.3) y se importa desde ahí en los tres controllers (Tasks 4.8, 4.9, 4.10). ✅
- `handleMulterError` se define en `middleware/upload.ts` y se importa en routes (Tasks 4.5, 4.6). ✅
- `validateEnv` se define en `config/env.ts` y se llama en `index.ts`. ✅
- `safeDeleteFile` ya existe en `utils/pathHelpers.ts` (verificado) y `deleteImage` lo llama correctamente. ✅
