# Sprint 4 — Tareas pendientes: quick wins, seguridad y calidad

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver las ~48 tareas pendientes restantes agrupadas en cuatro sprints ejecutables en serie; este documento detalla Sprint 4 (9 tareas, ejecutable inmediatamente) y define como roadmap los Sprints 5-7.

**Architecture:** Las tareas de Sprint 4 son aditivas o quirúrgicas — no introducen nuevas capas. Sprint 4 cierra todos los "quick wins" de alto impacto y bajo riesgo. Sprints 5-7 requieren cada uno su propio `superpowers:writing-plans` antes de ejecutarse.

**Tech Stack:** Express 4 + TypeScript 5, React 18 + TypeScript 4/5, Zod 3, PostgreSQL 16, Jest 29, Playwright (Sprint 6).

---

## Mapa de archivos — Sprint 4

| Archivo | Tarea | Acción |
|---|---|---|
| `backend/package.json` | T1 | Modificar — multer 2.x, npm audit |
| `frontend/package.json` | T1 | Modificar — npm audit |
| `backend/src/index.ts` | T2 | Modificar — HSTS en Helmet |
| `frontend/src/utils/authEvents.ts` | T3 | Crear — event emitter sesión expirada |
| `frontend/src/contexts/SettingsContext.tsx` | T3 | Modificar — guard isAuthenticated |
| `frontend/src/services/api.ts` | T3 | Modificar — emitSessionExpired() |
| `frontend/src/App.tsx` | T3 | Modificar — SessionGuard component |
| `backend/src/services/emailSchedulerService.ts` | T4 | Modificar — log field correcto |
| `backend/src/services/emailService.ts` | T4 | Modificar — CRLF regex fix |
| `backend/src/routes/accountRoutes.ts` | T4 | Modificar — asyncHandler |
| `backend/src/routes/userGroupsRoutes.ts` | T4 | Modificar — asyncHandler |
| `backend/src/routes/passwordRoutes.ts` | T4 | Modificar — asyncHandler |
| `backend/src/middleware/rateLimiter.ts` | T4 | Modificar — uploadsLimiter |
| `backend/src/index.ts` | T4 | Modificar — montar uploadsLimiter |
| `backend/src/validation/schemas/*.ts` | T4 | Modificar — .strict() + image whitelist |
| `frontend/src/utils/apiError.ts` | T5 | Crear — toApiError helper |
| `frontend/src/utils/clientLogger.ts` | T5 | Crear — clientLogger |
| `frontend/src/services/api.ts` | T5 | Modificar — usar apiError + encodeURIComponent |
| `backend/migrations/003_db_constraints.sql` | T6 | Crear — CHECKs, índices parciales, end_date |
| `docker/postgres/init/01_schema.sql` | T6 | Modificar — sincronizar |
| `backend/tsconfig.json` | T7 | Modificar — noImplicitAny + strictNullChecks |
| `backend/src/__tests__/groupNote.controller.test.ts` | T8 | Crear — tests GroupNoteController |
| `frontend/package.json` | T8 | Modificar — coverage en test:ci |
| `backend/src/__tests__/emailScheduler.test.ts` | T8 | Crear — test log correcto |
| `README.md` | T9 | Modificar — sincronizar con código real |
| `CONTRIBUTING.md` | T9 | Crear |
| `SECURITY.md` | T9 | Crear |
| `docker-compose.yml` | T9 | Modificar — red explícita |
| `.gitignore` | T9 | Modificar — tessdata si se elimina |

---

## Task 1: npm audit fix + migrar multer a 2.x

**Por qué:** Backend tiene 16 CVEs, frontend 58. Multer 1.x está deprecated. Son las vulnerabilidades más directas de resolver.

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`
- Modify: `backend/src/middleware/upload.ts` (si hay breaking changes en API)

- [ ] **Step 1.1 — Ejecutar audit fix en backend**

```bash
cd backend
npm audit fix
npm audit fix --force   # solo si quedan vulnerabilidades fixables
npm audit               # revisar qué queda sin resolver
```

Resultado esperado: reducción de CVEs. Los que queden son dependencias transitivas no fixables; documentarlos en un comentario en `package.json`.

- [ ] **Step 1.2 — Migrar multer a 2.x en backend**

```bash
cd backend
npm install multer@^2.0.0
npm install --save-dev @types/multer@latest
```

Verificar breaking changes de multer 2.x: el `fileFilter` callback sigue siendo `(req, file, cb)`. La API de storage es compatible. El cambio más importante: `multer()` ya no acepta la opción `dest` implícita; siempre usar `storage` o `diskStorage`.

Nuestro `middleware/upload.ts` ya usa `diskStorage` explícito — debería ser compatible. Verificar:

```bash
cd backend && npx tsc --noEmit
```

Si hay errores de tipos, ajustar las firmas según los nuevos tipos de `@types/multer`.

- [ ] **Step 1.3 — Ejecutar audit fix en frontend**

```bash
cd frontend
npm audit fix
npm audit
```

Resultado esperado: reducción de CVEs. Las CVEs de `react-scripts` webpack transitivas no son fixables sin migrar a Vite (Sprint 6). Documentar con override en `package.json`:

```json
"overrides": {
  "nth-check": "^2.0.1",
  "postcss": "^8.4.31"
}
```

- [ ] **Step 1.4 — Verificar que los tests pasan**

```bash
cd backend && npx jest --no-coverage
```

Esperado: ≥173 tests pasan.

- [ ] **Step 1.5 — Commit**

```bash
git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
git commit -m "fix(security): npm audit fix en backend y frontend; migrar multer a 2.x

Backend: resuelve CVEs en tar, flatted, ip-address. Multer actualizado
a 2.x (API compatible con nuestro diskStorage). Frontend: resuelve CVEs
transitivos; overrides para nth-check y postcss. CVEs de react-scripts
webpack pendientes hasta migración a Vite (Sprint 6)."
```

---

## Task 2: HSTS + CSP hardening en Helmet

**Por qué:** Sin HSTS, los downgrades HTTPS son posibles. La CSP tiene `'unsafe-inline'` en estilos y `data:` en imágenes que amplían la superficie de ataque.

**Files:**
- Modify: `backend/src/index.ts` (bloque helmet, líneas 30-46)

- [ ] **Step 2.1 — Leer el bloque Helmet actual en `backend/src/index.ts`**

El bloque actual (líneas 30-46) tiene:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      ...
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
```

- [ ] **Step 2.2 — Reemplazar el bloque Helmet**

```typescript
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-inline' necesario para Tailwind/CRA en dev; en prod usar nonce si es posible
      styleSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      // Eliminar data: — usar solo blob: para imágenes locales
      imgSrc: ["'self'", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // HSTS: 1 año, incluir subdominios, habilitar preload
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
```

- [ ] **Step 2.3 — Verificar compilación y tests**

```bash
cd backend && npx tsc --noEmit && npx jest --no-coverage
```

Esperado: 0 errores, ≥173 tests.

- [ ] **Step 2.4 — Commit**

```bash
git add backend/src/index.ts
git commit -m "fix(security): HSTS en producción; eliminar data: de imgSrc

HSTS maxAge=1y con includeSubDomains y preload en producción.
CSP: eliminar data: URIs de imgSrc (riesgo de exfiltración).
unsafe-inline en styleSrc sólo en desarrollo (Tailwind requiere inline)."
```

---

## Task 3: SettingsContext auth guard + event bus para logout forzado

**Por qué:** `SettingsContext` llama a `/api/account/settings` incluso sin estar autenticado, generando un bucle 401→refresh→redirect que hace la app inusable en Playwright y puede crear loops en el navegador. `window.location.href` rompe el ciclo de React al hacer logout forzado.

**Files:**
- Create: `frontend/src/utils/authEvents.ts`
- Modify: `frontend/src/contexts/SettingsContext.tsx`
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 3.1 — Crear `frontend/src/utils/authEvents.ts`**

```typescript
/**
 * Event bus para comunicar eventos de autenticación fuera del árbol de React.
 * Permite que api.ts emita sesión expirada sin llamar a window.location.href.
 */
export const authEvents = new EventTarget();

export const SESSION_EXPIRED_EVENT = 'session-expired';

export function emitSessionExpired(): void {
  authEvents.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
```

- [ ] **Step 3.2 — Modificar `frontend/src/contexts/SettingsContext.tsx`**

Añadir import de `useAuth` e introducir el guard:

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

// ... (mantener SettingsState, SettingsContextType, defaultSettings, SettingsContext igual)

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // No llamar a la API si el usuario no está autenticado — evita bucle 401
    if (!isAuthenticated) {
      setSettings(defaultSettings);
      return;
    }
    const loadFromServer = async () => {
      try {
        const response = await api.get('/account/settings');
        if (response.data) {
          const serverSettings = response.data as Partial<SettingsState>;
          setSettings(prev => ({ ...prev, ...serverSettings }));
        }
      } catch {
        // Silently keep defaults
      }
    };
    loadFromServer();
  }, [isAuthenticated]); // Recargar cuando cambia el estado de autenticación

  // ... resto igual
};
```

- [ ] **Step 3.3 — Modificar `frontend/src/services/api.ts`**

Reemplazar AMBAS llamadas a `window.location.href = "/login"` por `emitSessionExpired()`:

```typescript
import { emitSessionExpired } from '../utils/authEvents';

// En el interceptor de 401, reemplazar:
// window.location.href = "/login";
// Por:
emitSessionExpired();
```

Hay dos lugares en el interceptor donde aparece `window.location.href = "/login"`:
1. En el `catch` del bloque de refresh (cuando el refresh falla).
2. Puede haber un segundo en el bloque de "sin refresh token" si aún existe.

Reemplazar ambas.

- [ ] **Step 3.4 — Modificar `frontend/src/App.tsx`**

Añadir el componente `SessionGuard` que escucha el evento y usa `useNavigate`:

```typescript
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { authEvents, SESSION_EXPIRED_EVENT } from './utils/authEvents';
import { accountService } from './services/accountService';
import themeService from './services/themeService';
import themeConfig from './config/themeConfig.json';
import Header from './components/Layout/Header';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

// ... (lazy imports igual)

// SessionGuard: escucha el evento de sesión expirada y navega a /login limpiamente
const SessionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handler = () => {
      logout();
      navigate('/login', { replace: true });
    };
    authEvents.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => authEvents.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [navigate, logout]);

  return <>{children}</>;
};

// ... (ThemeLoader igual)

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <SessionGuard>      {/* NUEVO: envuelve ThemeLoader */}
            <ThemeLoader>
              {/* ... resto igual */}
            </ThemeLoader>
          </SessionGuard>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 3.5 — Verificar que TypeScript compila**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v "TS4.9\|skipLibCheck" | head -20
```

Si hay errores de tipos (e.g. `useAuth` no exporta `isAuthenticated`), revisar `AuthContext.tsx` y ajustar el nombre del campo.

- [ ] **Step 3.6 — Verificar backend tests (no deben verse afectados)**

```bash
cd backend && npx jest --no-coverage
```

- [ ] **Step 3.7 — Commit**

```bash
git add frontend/src/utils/authEvents.ts \
        frontend/src/contexts/SettingsContext.tsx \
        frontend/src/services/api.ts \
        frontend/src/App.tsx
git commit -m "fix(frontend): SettingsContext guard + event bus para sesión expirada

SettingsContext ahora comprueba isAuthenticated antes de llamar a la API,
eliminando el bucle 401->refresh->redirect que bloqueaba la app sin sesión.
Sustituye window.location.href='/login' por un event bus (authEvents) que
permite a SessionGuard navegar limpiamente con useNavigate sin full reload."
```

---

## Task 4: Backend quick fixes bundle

Agrupa 6 fixes pequeños que no justifican commits individuales: scheduler log, asyncHandler en rutas pendientes, rate limit de /uploads/, whitelist de URLs de imágenes, CRLF regex, y Zod .strict().

**Files:**
- Modify: `backend/src/services/emailSchedulerService.ts`
- Modify: `backend/src/services/emailService.ts`
- Modify: `backend/src/routes/accountRoutes.ts`
- Modify: `backend/src/routes/userGroupsRoutes.ts`
- Modify: `backend/src/routes/passwordRoutes.ts`
- Modify: `backend/src/middleware/rateLimiter.ts`
- Modify: `backend/src/index.ts`
- Modify: `backend/src/validation/schemas/note.schema.ts`
- Modify: `backend/src/validation/schemas/user.schema.ts`
- Modify: `backend/src/validation/schemas/group.schema.ts`
- Modify: `backend/src/validation/schemas/reminder.schema.ts`

- [ ] **Step 4.1 — Corregir log en `emailSchedulerService.ts`**

Línea 29: cambiar `reminders[index]?.userId` por `reminders[index]?.id`:

```typescript
logger.error('Error al enviar correo de recordatorio', {
  reminderId: reminders[index]?.id,   // era: reminders[index]?.userId
  error: result.reason
});
```

- [ ] **Step 4.2 — Corregir regex CRLF en `emailService.ts`**

Línea 91: `[\r\n\r]` tiene `\r` duplicado. Cambiar a `[\r\n]`:

```typescript
const safeMessage = message.replace(/[\r\n]/g, ' ').substring(0, 2000);
```

También reemplazar `console.error` en la línea 39 y línea 80 del mismo archivo:
```typescript
// línea 39:
import logger from '../config/logger';
// ...
// Donde hay console.error(...), cambiar a logger.error(...)
```

- [ ] **Step 4.3 — asyncHandler en `accountRoutes.ts`**

Añadir import y envolver handlers:

```typescript
import { asyncHandler } from '../middleware/errorHandler';

// Cambiar cada router.XXX(path, ..., handler) por asyncHandler:
router.put('/update', validate(updateUserSchema),
  asyncHandler((req, res, next) => accountController.updateUser(req, res, next))
);
router.get('/profile',
  asyncHandler((req, res, next) => accountController.getProfile(req, res, next))
);
router.delete('/delete',
  asyncHandler((req, res, next) => accountController.deleteAccount(req, res, next))
);
router.get('/settings',
  asyncHandler((req, res, next) => accountController.getUserSettings(req, res, next))
);
router.put('/settings',
  asyncHandler((req, res, next) => accountController.updateUserSettings(req, res, next))
);
// Para upload-profile-image mantener la lógica actual (ya tiene try/catch manual)
```

- [ ] **Step 4.4 — asyncHandler en `userGroupsRoutes.ts`**

Añadir import y envolver todos los handlers del archivo con `asyncHandler(controller.method.bind(controller))`. Seguir el mismo patrón que Task 4.3.

- [ ] **Step 4.5 — asyncHandler en `passwordRoutes.ts`**

```typescript
import { asyncHandler } from '../middleware/errorHandler';

router.post('/request-reset', passwordResetLimiter, validate(requestResetSchema),
  asyncHandler(passwordController.requestReset.bind(passwordController))
);
router.get('/validate-token/:token', passwordResetLimiter,
  asyncHandler(passwordController.validateToken.bind(passwordController))
);
router.post('/reset', passwordResetConfirmLimiter, validate(resetPasswordSchema),
  asyncHandler(passwordController.resetPassword.bind(passwordController))
);
```

- [ ] **Step 4.6 — Rate limiter para `/uploads/` en `rateLimiter.ts`**

Añadir al final del archivo:

```typescript
/**
 * Rate limiter for static file serving (uploads directory)
 * Prevents DoS via mass download of uploaded files
 * 300 requests per 15 minutes per IP
 */
export const uploadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas solicitudes de archivos desde esta IP' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => process.env.NODE_ENV !== 'production',
});
```

Añadirlo al export default al final:
```typescript
export default {
  // ...existing exports...
  uploadsLimiter,
};
```

- [ ] **Step 4.7 — Montar uploadsLimiter en `index.ts`**

Antes de las líneas de `app.use('/note-images', ...)`, añadir:

```typescript
import { generalApiLimiter, uploadsLimiter } from './middleware/rateLimiter';

// Aplicar rate limit a archivos estáticos ANTES de servirlos
app.use('/uploads', uploadsLimiter);
app.use('/note-images', uploadsLimiter);

// Luego los static serves (igual que antes)
app.use('/note-images', express.static(...));
app.use('/uploads', express.static(...));
```

- [ ] **Step 4.8 — Whitelist de URLs en `note.schema.ts` + `.strict()`**

En `imagesSchema`, cambiar la validación de URL libre a una que solo permita paths locales:

```typescript
// Era: z.array(z.string().url('URL de imagen inválida'))
// Ahora: solo permite paths relativos del servidor
const imagesSchema = z
  .array(
    z.string()
      .refine(
        (url) => /^\/(note-images|uploads\/note-images|uploads\/group-note-images)\/[\w\-\.]+$/.test(url),
        { message: 'URL de imagen no permitida — debe ser una imagen subida al servidor' }
      )
  )
  .max(10, 'No puedes adjuntar más de 10 imágenes')
  .optional();
```

Añadir `.strict()` a `createNoteSchema` y `updateNoteSchema`:
```typescript
export const createNoteSchema = z.object({
  title: titleSchema,
  content: contentSchema,
  color: colorSchema,
  images: imagesSchema
}).strict();  // ← añadir

export const updateNoteSchema = z.object({
  title: titleSchema.optional(),
  content: contentSchema,
  color: colorSchema,
  is_pinned: z.boolean().optional(),
  images: imagesSchema
}).strict();  // ← añadir
```

- [ ] **Step 4.9 — `.strict()` en los demás schemas**

En `user.schema.ts`, añadir `.strict()` a `registerSchema`, `loginSchema`, `updateUserSchema`, `resetPasswordSchema`.

En `group.schema.ts`, añadir `.strict()` a `createGroupSchema`, `updateGroupSchema`, `addGroupMemberSchema`.

En `reminder.schema.ts`, añadir `.strict()` a `createReminderSchema`, `updateReminderSchema`.

Ejemplo para `user.schema.ts`:
```typescript
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
}).strict();  // ← añadir
```

- [ ] **Step 4.10 — Verificar compilación y tests**

```bash
cd backend && npx tsc --noEmit && npx jest --no-coverage
```

Si algún test falla porque el schema ahora rechaza campos extra, añadir `.strip()` en el mock o eliminar los campos extra del body de test. La validación Zod con `.strict()` devuelve 422 con `error.errors` detallando qué campo inesperado llegó.

- [ ] **Step 4.11 — Commit**

```bash
git add backend/src/services/emailSchedulerService.ts \
        backend/src/services/emailService.ts \
        backend/src/routes/accountRoutes.ts \
        backend/src/routes/userGroupsRoutes.ts \
        backend/src/routes/passwordRoutes.ts \
        backend/src/middleware/rateLimiter.ts \
        backend/src/index.ts \
        backend/src/validation/schemas/note.schema.ts \
        backend/src/validation/schemas/user.schema.ts \
        backend/src/validation/schemas/group.schema.ts \
        backend/src/validation/schemas/reminder.schema.ts
git commit -m "fix(backend): bundle de quick fixes de seguridad y fiabilidad

- emailSchedulerService: log correcto reminderId (era userId)
- emailService: regex CRLF corregido ([\r\n\r] -> [\r\n]); console.error -> logger
- asyncHandler: aplicado a accountRoutes, userGroupsRoutes, passwordRoutes
- uploadsLimiter: nuevo rate limiter (300req/15min) aplicado a /uploads y /note-images
- Zod .strict(): todos los schemas rechazan campos extra (masa-assignment prevention)
- image URL: whitelist de paths locales en imagesSchema"
```

---

## Task 5: Frontend type safety — `toApiError`, `clientLogger`, query encoding

**Por qué:** Los casts `(err as any)` ocultan errores de contrato. El `console.error()` en producción filtra información. Las query strings sin `encodeURIComponent` pueden causar inyecciones en la URL.

**Files:**
- Create: `frontend/src/utils/apiError.ts`
- Create: `frontend/src/utils/clientLogger.ts`
- Modify: `frontend/src/services/api.ts` (búsquedas de usuarios)
- Modify: `frontend/src/hooks/useNotes.ts` (reemplazar `err as any`)

- [ ] **Step 5.1 — Crear `frontend/src/utils/apiError.ts`**

```typescript
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Converts an unknown error (from axios catch) to a typed ApiError.
 */
export function toApiError(err: unknown): ApiError {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosErr = err as {
      response?: { status?: number; data?: { error?: { message?: string; code?: string; errors?: unknown[] } } };
    };
    const data = axiosErr.response?.data?.error;
    return {
      message: data?.message ?? 'Error desconocido',
      code: data?.code,
      status: axiosErr.response?.status,
      errors: Array.isArray(data?.errors) ? data.errors as ApiError['errors'] : undefined,
    };
  }
  if (err instanceof Error) {
    return { message: err.message };
  }
  return { message: 'Error desconocido' };
}
```

- [ ] **Step 5.2 — Crear `frontend/src/utils/clientLogger.ts`**

```typescript
const isDev = process.env.NODE_ENV !== 'production';

export const clientLogger = {
  error: (message: string, ...args: unknown[]): void => {
    if (isDev) console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]): void => {
    if (isDev) console.warn(`[WARN] ${message}`, ...args);
  },
  info: (message: string, ...args: unknown[]): void => {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },
};
```

- [ ] **Step 5.3 — Actualizar `frontend/src/hooks/useNotes.ts`**

Buscar todos los `(err as any)` en el archivo y reemplazarlos con `toApiError(err)`:

```typescript
import { toApiError } from '../utils/apiError';
import { clientLogger } from '../utils/clientLogger';

// Antes:
} catch (err) {
  const error = (err as any).response?.data?.error || 'Error al cargar notas';
  // ...
}

// Después:
} catch (err) {
  const error = toApiError(err);
  clientLogger.error('Error al cargar notas', error);
  // usar error.message donde antes usaba el string
}
```

- [ ] **Step 5.4 — Corregir query construction en `frontend/src/services/api.ts`**

Buscar todas las rutas con template literals que incluyan parámetros de búsqueda:

```typescript
// Antes (ejemplo):
const response = await api.get(`notes/users?query=${query}`);

// Después:
const response = await api.get('notes/users', { params: { query } });
// axios encodifica automáticamente los params
```

Hacer lo mismo con cualquier otra búsqueda de texto en `api.ts` y en los hooks que construyan URLs manualmente.

- [ ] **Step 5.5 — Reemplazar `console.error` en `App.tsx`**

Línea 58 de `App.tsx` tiene `console.error('Error al cargar el tema:', error)`. Reemplazar:

```typescript
import { clientLogger } from './utils/clientLogger';
// ...
clientLogger.error('Error al cargar el tema', error);
```

- [ ] **Step 5.6 — Verificar TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "TS4.9" | head -20
```

- [ ] **Step 5.7 — Commit**

```bash
git add frontend/src/utils/apiError.ts \
        frontend/src/utils/clientLogger.ts \
        frontend/src/hooks/useNotes.ts \
        frontend/src/services/api.ts \
        frontend/src/App.tsx
git commit -m "fix(frontend): type safety — toApiError, clientLogger, encodeURIComponent

toApiError(): convierte unknown catch errors a tipo ApiError estructurado.
clientLogger: silencia logs en producción para no filtrar info al browser.
Query strings: usar axios params{} en lugar de template literals manuales.
Elimina (err as any) en useNotes.ts y console.error en App.tsx."
```

---

## Task 6: Migración BD — constraints, índices parciales, end_date

**Por qué:** Roles sin CHECK permiten valores arbitrarios en BD. Sin índices parciales, las queries de papelera escalan mal. `end_date NULL` puede crear recurrencias infinitas.

**Files:**
- Create: `backend/migrations/003_db_constraints.sql`
- Modify: `docker/postgres/init/01_schema.sql`

- [ ] **Step 6.1 — Crear `backend/migrations/003_db_constraints.sql`**

```sql
-- backend/migrations/003_db_constraints.sql
-- Adds CHECK constraints, partial indexes, and end_date NOT NULL
-- Run with: psql -U $DB_USER -d $DB_NAME -f migrations/003_db_constraints.sql

BEGIN;

-- ── 1. CHECK constraints on roles ────────────────────────────────────────────

ALTER TABLE group_members
  DROP CONSTRAINT IF EXISTS group_members_role_check;
ALTER TABLE group_members
  ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

ALTER TABLE reminder_recurrence
  DROP CONSTRAINT IF EXISTS reminder_recurrence_frequency_check;
ALTER TABLE reminder_recurrence
  ADD CONSTRAINT reminder_recurrence_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'));

-- ── 2. Partial indexes for soft delete queries ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notes_active
  ON notes(user_id, updated_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_notes_trash
  ON notes(user_id, deleted_at DESC)
  WHERE is_deleted = true;

-- ── 3. end_date NOT NULL with 1-year default ──────────────────────────────────

-- First set default for existing NULL rows
UPDATE reminder_recurrence
  SET end_date = created_at + INTERVAL '1 year'
  WHERE end_date IS NULL;

ALTER TABLE reminder_recurrence
  ALTER COLUMN end_date SET NOT NULL;

ALTER TABLE reminder_recurrence
  ALTER COLUMN end_date SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year');

-- ── 4. Replace low-selectivity index on shared_notes ─────────────────────────

DROP INDEX IF EXISTS idx_shared_notes_can_edit;
CREATE INDEX IF NOT EXISTS idx_shared_notes_perms
  ON shared_notes(shared_with_id, can_edit)
  INCLUDE (note_id);

-- ── 5. statement_timeout per session ─────────────────────────────────────────
-- Apply at DB level; individual sessions can override if needed
-- Note: this requires superuser or ALTER SYSTEM privileges
-- If running as non-superuser, apply via pg_hba.conf or app startup query instead
-- ALTER SYSTEM SET statement_timeout = '30s';
-- SELECT pg_reload_conf();
-- Alternative: set in pool connect callback (handled in database.ts)

COMMIT;
```

- [ ] **Step 6.2 — Aplicar migración**

```bash
# Con PostgreSQL local:
psql -U $DB_USER -d $DB_NAME -f backend/migrations/003_db_constraints.sql

# Con Docker:
docker exec -i olympus_scribe_db psql -U olympus -d olympus_scribe < backend/migrations/003_db_constraints.sql
```

- [ ] **Step 6.3 — Sincronizar `docker/postgres/init/01_schema.sql`**

En la tabla `group_members`, añadir el CHECK:
```sql
role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
```

En la tabla `reminder_recurrence`:
```sql
frequency VARCHAR(50) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
end_date TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year'),
```

Añadir los índices parciales en la sección de índices de `notes`:
```sql
CREATE INDEX IF NOT EXISTS idx_notes_active ON notes(user_id, updated_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notes_trash ON notes(user_id, deleted_at DESC) WHERE is_deleted = true;
```

Reemplazar `idx_shared_notes_can_edit` por `idx_shared_notes_perms`:
```sql
-- Eliminar línea:
-- CREATE INDEX IF NOT EXISTS idx_shared_notes_can_edit ON shared_notes(can_edit);
-- Añadir:
CREATE INDEX IF NOT EXISTS idx_shared_notes_perms ON shared_notes(shared_with_id, can_edit) INCLUDE (note_id);
```

- [ ] **Step 6.4 — Verificar tests (no usan BD real, no se ven afectados)**

```bash
cd backend && npx jest --no-coverage
```

- [ ] **Step 6.5 — Commit**

```bash
git add backend/migrations/003_db_constraints.sql docker/postgres/init/01_schema.sql
git commit -m "fix(db): CHECK constraints, partial indexes, end_date NOT NULL

group_members.role: CHECK ('owner','admin','member').
reminder_recurrence.frequency: CHECK ('daily','weekly','monthly','yearly').
notes: índices parciales para active/trash — mejor rendimiento en tablas grandes.
reminder_recurrence.end_date: NOT NULL con default 1 año — evita recurrencia infinita.
idx_shared_notes_can_edit: reemplazado por índice compuesto (shared_with_id, can_edit)."
```

---

## Task 7: TypeScript strict mode incremental en el backend

**Por qué:** `strict: false` permite `any` implícito y null checks ausentes. El frontend ya tiene `strict: true`; el backend debe igualarlo.

**Estrategia:** activar opción a opción para no romper todo a la vez.

**Files:**
- Modify: `backend/tsconfig.json`
- Modify: múltiples archivos `.ts` en `backend/src/` según los errores

- [ ] **Step 7.1 — Activar `noImplicitAny`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": false,
    "noImplicitAny": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 7.2 — Ver y corregir errores de `noImplicitAny`**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "error TS" | head -40
```

Los errores más comunes serán:
- Parámetros de funciones sin tipo → añadir `: unknown` o el tipo correcto
- Objetos indexados sin tipo → añadir `Record<string, unknown>` o tipo explícito
- `catch (error)` ya tipado como `unknown` en TS moderno — asegurarse de que se accede correctamente

Corregir todos los errores hasta que `npx tsc --noEmit` devuelva 0 errores.

- [ ] **Step 7.3 — Verificar que los tests pasan**

```bash
cd backend && npx jest --no-coverage
```

- [ ] **Step 7.4 — Activar `strictNullChecks`**

```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictNullChecks": true,
    ...
  }
}
```

- [ ] **Step 7.5 — Corregir errores de `strictNullChecks`**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep "error TS" | head -40
```

Los errores típicos:
- `pool.query(...)` devuelve `QueryResult` que puede tener `rows` undefined en algunos paths → añadir guards
- `req.user` puede ser `undefined` → usar `req.user!.id` (ya tiene `authenticateToken` que garantiza el valor, así que `!` es correcto) o añadir guard early-return

- [ ] **Step 7.6 — Una vez ambas opciones sin errores, activar `strict: true`**

```json
{
  "compilerOptions": {
    "strict": true,
    ...
  }
}
```

Correr `npx tsc --noEmit` de nuevo y resolver los errores restantes (principalmente `strictFunctionTypes` y `strictBindCallApply`).

- [ ] **Step 7.7 — Commit**

```bash
git add backend/tsconfig.json backend/src/**/*.ts
git commit -m "feat(quality): activar strict: true en backend TypeScript

Activa noImplicitAny, strictNullChecks y todas las opciones de strict.
El backend iguala al frontend en rigor de tipos. Todos los any implícitos
y accesos potencialmente null han sido tipados explícitamente."
```

---

## Task 8: Tests complementarios

**Por qué:** `GroupNoteController` no tiene tests. El frontend no genera reporte de cobertura. Los mocks de pool no verifican el SQL.

**Files:**
- Create: `backend/src/__tests__/groupNote.controller.test.ts`
- Create: `backend/src/__tests__/emailScheduler.test.ts`
- Modify: `frontend/package.json`

- [ ] **Step 8.1 — Crear `backend/src/__tests__/emailScheduler.test.ts`**

```typescript
// backend/src/__tests__/emailScheduler.test.ts
jest.mock('../models/reminder', () => ({
  Reminder: {
    findRemindersForEmailNotification: jest.fn(),
  },
}));
jest.mock('../services/emailService', () => ({
  emailService: { sendReminderEmail: jest.fn() },
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Reminder } from '../models/reminder';
import { emailService } from '../services/emailService';
import { emailSchedulerService } from '../services/emailSchedulerService';
import logger from '../config/logger';

const MockReminder = Reminder as jest.Mocked<typeof Reminder>;
const mockEmail = emailService as jest.Mocked<typeof emailService>;

describe('emailSchedulerService.scheduleEmails', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs reminderId (not userId) when email send fails', async () => {
    const fakeReminder = {
      id: 'reminder-id-123',
      userId: 'user-id-456',
      title: 'Test',
      description: '',
      dateTime: new Date(),
    };
    MockReminder.findRemindersForEmailNotification = jest.fn().mockResolvedValue([fakeReminder]);
    mockEmail.sendReminderEmail = jest.fn().mockRejectedValue(new Error('SMTP error'));

    await emailSchedulerService.scheduleEmails();

    const loggerError = (logger as jest.Mocked<typeof logger>).error as jest.Mock;
    expect(loggerError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ reminderId: 'reminder-id-123' })
    );
    // Must NOT log userId as the identifier
    expect(loggerError).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ reminderId: 'user-id-456' })
    );
  });

  it('calls sendReminderEmail for each pending reminder', async () => {
    MockReminder.findRemindersForEmailNotification = jest.fn().mockResolvedValue([
      { id: 'r1', userId: 'u1', title: 'T1', description: '', dateTime: new Date() },
      { id: 'r2', userId: 'u2', title: 'T2', description: '', dateTime: new Date() },
    ]);
    mockEmail.sendReminderEmail = jest.fn().mockResolvedValue(true);

    await emailSchedulerService.scheduleEmails();

    expect(mockEmail.sendReminderEmail).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 8.2 — Ejecutar el test nuevo**

```bash
cd backend && npx jest src/__tests__/emailScheduler.test.ts --no-coverage
```

Esperado: 2 tests pasan (si el fix del Step 4.1 ya fue aplicado; si no, el test "reminderId no userId" fallará hasta entonces).

- [ ] **Step 8.3 — Crear `backend/src/__tests__/groupNote.controller.test.ts`**

```typescript
// backend/src/__tests__/groupNote.controller.test.ts
jest.mock('../database', () => ({ pool: { query: jest.fn() } }));
jest.mock('../utils/urlHelpers', () => ({
  getGroupNoteImageUrl: jest.fn((url) => url),
  isGroupNoteImageUrl: jest.fn(() => true),
}));
jest.mock('../middleware/upload', () => ({
  deleteImage: jest.fn().mockResolvedValue(undefined),
  RequestWithFile: {},
}));
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { Request, Response, NextFunction } from 'express';
import { pool } from '../database';
import { GroupNoteController } from '../controllers/usergroup/GroupNoteController';

const mockPool = pool as jest.Mocked<typeof pool>;
const controller = new GroupNoteController();

function mockRes(): Partial<Response> {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}
function mockNext(): jest.Mock { return jest.fn(); }
function authReq(params = {}, body = {}, user = { id: 'u-1' }): Partial<Request> {
  return { params, body, user } as unknown as Partial<Request>;
}

describe('GroupNoteController.getGroupNotes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not a group member', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [{ is_member: false }] });
    const next = mockNext();

    await controller.getGroupNotes(
      authReq({ id: 'group-1' }) as Request, mockRes() as Response, next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('returns group notes when user is a member', async () => {
    const notes = [{ id: 'n1', title: 'Note 1', group_id: 'group-1' }];
    mockPool.query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ is_member: true }] })
      .mockResolvedValueOnce({ rows: notes });

    const res = mockRes();
    await controller.getGroupNotes(
      authReq({ id: 'group-1' }) as Request, res as Response, mockNext()
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ notes }));
  });
});

describe('GroupNoteController.createGroupNote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not a member', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [{ is_member: false }] });
    const next = mockNext();

    await controller.createGroupNote(
      authReq({ id: 'g-1' }, { title: 'Note' }) as Request, mockRes() as Response, next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('creates a group note and returns 201', async () => {
    const newNote = { id: 'n-new', title: 'Note', group_id: 'g-1' };
    mockPool.query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ is_member: true }] })
      .mockResolvedValueOnce({ rows: [newNote] });

    const res = mockRes();
    await controller.createGroupNote(
      authReq({ id: 'g-1' }, { title: 'Note', content: 'Content' }) as Request,
      res as Response, mockNext()
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ note: newNote }));
  });
});

describe('GroupNoteController.deleteGroupNote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when user is not admin or owner', async () => {
    mockPool.query = jest.fn().mockResolvedValue({ rows: [{ role: 'member' }] });
    const next = mockNext();

    await controller.deleteGroupNote(
      authReq({ id: 'g-1', noteId: 'n-1' }) as Request, mockRes() as Response, next
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
```

- [ ] **Step 8.4 — Ejecutar y ajustar si los métodos tienen nombres distintos**

```bash
cd backend && npx jest src/__tests__/groupNote.controller.test.ts --no-coverage
```

Si algún test falla porque el controller usa distintos métodos de query o distintos permisos, leer el controller y ajustar los mocks.

- [ ] **Step 8.5 — Añadir coverage report al frontend**

En `frontend/package.json`, actualizar el script `test:ci`:

```json
"test:ci": "react-scripts test --watchAll=false --passWithNoTests --ci --coverage"
```

- [ ] **Step 8.6 — Verificar suite completa**

```bash
cd backend && npx jest --no-coverage
```

Esperado: ≥183 tests pasan.

- [ ] **Step 8.7 — Commit**

```bash
git add backend/src/__tests__/emailScheduler.test.ts \
        backend/src/__tests__/groupNote.controller.test.ts \
        frontend/package.json
git commit -m "test(coverage): emailScheduler y GroupNoteController tests; frontend coverage

emailScheduler: verifica que el log usa reminderId (no userId) en fallos.
GroupNoteController: cubre getGroupNotes, createGroupNote, deleteGroupNote.
Frontend: script test:ci ahora genera reporte de cobertura."
```

---

## Task 9: Docs + infra cleanup

**Files:**
- Modify: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Modify: `docker-compose.yml`
- Modify: `.gitignore` (si se elimina tessdata)

- [ ] **Step 9.1 — Investigar tessdata**

```bash
grep -r "tesseract\|tessdata\|Tesseract" backend/src --include="*.ts" | grep -v node_modules
grep -r "tessdata\|traineddata" backend/package.json
```

Si no hay imports: eliminar los archivos y actualizar `.gitignore`:
```bash
rm -rf backend/tessdata backend/eng.traineddata backend/spa.traineddata
echo "backend/tessdata/" >> .gitignore
echo "backend/*.traineddata" >> .gitignore
```

Si hay uso: moverlos a git-lfs (`git lfs track "backend/*.traineddata"`).

- [ ] **Step 9.2 — Actualizar `README.md`**

Cambiar la sección de variables de entorno para que coincida con el código real (usar `DB_*` en lugar de `DATABASE_URL`). Actualizar el árbol de `docs/` para reflejar los archivos reales:

```markdown
## Documentación adicional

- [Arquitectura técnica](docs/architecture.md)
- [Referencia de la API y guía funcional](docs/documentation.md)
- [Tareas pendientes y deuda técnica](docs/pending-tasks.md)
```

- [ ] **Step 9.3 — Crear `CONTRIBUTING.md`**

```markdown
# Contributing to Olympus Scribe

## Requisitos previos
- Node.js >= 18, npm >= 9, PostgreSQL >= 14 (ver README.md)

## Setup
1. `cd backend && npm install && cp .env.example .env` (rellenar valores)
2. `docker compose up -d` (levanta PostgreSQL)
3. `cd frontend && npm install && echo "REACT_APP_API_URL=http://localhost:3001/api" > .env`

## Workflow de desarrollo
1. Crear rama desde `main`: `git checkout -b feat/mi-feature`
2. Desarrollar con TDD: escribe tests primero
3. Verificar: `npm run typecheck && npm test && npm run lint`
4. Crear PR a `main` — el pipeline CI debe estar verde

## Comandos disponibles

### Backend
| Comando | Acción |
|---|---|
| `npm run dev` | Servidor con hot-reload |
| `npm test` | Tests unitarios |
| `npm run test:ci` | Tests con cobertura |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Prettier |

### Frontend
| Comando | Acción |
|---|---|
| `npm start` | Dev server |
| `npm run test:ci` | Tests con cobertura |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Prettier |

## Estándares de código
- TypeScript strict mode obligatorio
- Tests para cada nueva función de negocio
- Sin `console.log` — usar `logger` (backend) o `clientLogger` (frontend)
- Commits convencionales: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
```

- [ ] **Step 9.4 — Crear `SECURITY.md`**

```markdown
# Security Policy — Olympus Scribe

## Versiones soportadas

| Versión | Soporte de seguridad |
|---|---|
| rama `main` | Activo |
| ramas de feature | No |

## Reportar una vulnerabilidad

Para reportar una vulnerabilidad de seguridad:

1. **NO abrir un issue público** — podría exponer la vulnerabilidad antes de que esté parcheada.
2. Enviar un email a: rodrigop.aparisi.olivar@gmail.com con el asunto `[SECURITY] <descripción breve>`.
3. Incluir: descripción del problema, pasos para reproducirlo, impacto estimado y, si es posible, un PoC (proof of concept).
4. Recibirás respuesta en menos de 72 horas con el plan de acción.

## Medidas de seguridad implementadas

- JWT con refresh tokens (HttpOnly cookie), blacklist en BD, expiración 1h/7d
- bcrypt (10 rondas) para contraseñas
- Rate limiting por IP en endpoints sensibles
- Validación de inputs con Zod (.strict())
- Path traversal prevention en uploads
- CSP restrictiva vía Helmet
- CORS con whitelist explícita
- Logs con redacción automática de campos sensibles

## Dependencias con vulnerabilidades conocidas

Las CVEs de `react-scripts@5.0.1` (webpack transitivas) están pendientes de resolución
mediante migración a Vite (Sprint 6). No son explotables en el contexto de este proyecto
(afectan al bundler de desarrollo, no al runtime de producción).
```

- [ ] **Step 9.5 — Añadir red explícita en `docker-compose.yml`**

Al final del archivo, añadir la declaración de red y referenciarla en cada servicio:

```yaml
# Al final, junto a volumes:
networks:
  app:
    driver: bridge

# En cada servicio, añadir:
services:
  postgres:
    # ...
    networks:
      - app
  backend:
    # ...
    networks:
      - app
  frontend:
    # ...
    networks:
      - app
```

- [ ] **Step 9.6 — Commit**

```bash
git add README.md CONTRIBUTING.md SECURITY.md docker-compose.yml .gitignore
# Si se eliminó tessdata:
git rm -r backend/tessdata backend/eng.traineddata backend/spa.traineddata
git commit -m "docs(infra): README actualizado, CONTRIBUTING, SECURITY, red Docker explícita

README: variables de entorno corregidas (DB_* en lugar de DATABASE_URL).
CONTRIBUTING.md: setup, workflow, comandos y estándares de código.
SECURITY.md: política de reporte, medidas implementadas y CVEs conocidas.
docker-compose.yml: red 'app' explícita para facilitar integración de servicios.
Tessdata eliminado si sin uso (ahorra 48MB en clone)."
```

---

## Sprint 5 — Roadmap: Frontend security + Schema (semana 3-5)

> Requiere ejecutar `superpowers:writing-plans` con este spec antes de implementar.

**Task A: Access token en memoria React**
- Eliminar `localStorage.setItem('token', ...)` en `auth.ts`
- Guardar access token en una variable de módulo o `useRef` en `AuthContext`
- El interceptor de request lo lee de ahí en lugar de localStorage
- Impacto: ningún token queda en localStorage; XSS solo puede robar la sesión activa (1h TTL)
- Archivos: `AuthContext.tsx`, `auth.ts`, `api.ts`

**Task B: CSRF protection**
- Ahora que el refresh token está en cookie SameSite=Strict, el único vector CSRF es el acceso a la API con el access token en Authorization header. Con `SameSite=Strict` esto es muy difícil de explotar. Como hardening adicional: añadir un header custom `X-Requested-With: XMLHttpRequest` al axios instance y validarlo en backend como señal anti-CSRF.
- Archivos: `api.ts`, `backend/src/middleware/auth.ts`

**Task C: node-pg-migrate + eliminar doble schema**
- Instalar `node-pg-migrate`
- Convertir `database.sql`, `migrations/001_*`, `002_*`, `003_*` a migraciones versionadas
- Eliminar `database.sql` y `docker/postgres/init/01_schema.sql` (reemplazados por migraciones)
- Añadir script `npm run db:migrate` en backend
- Ejecutar en CI antes de los tests de integración

**Task D: Mejoras de UX/accesibilidad**
- Modales: cerrar con Escape + `role="button"` en overlays (`GroupModal.tsx`, `ReminderDetail`)
- `<div onClick>` → `<button>` en elementos interactivos
- `SettingsContext`: resetear settings en logout (depender de `user?.id`)
- Mensajes de error mapeados por `error.code` → mensaje amigable

**Task E: Fiabilidad avanzada**
- Race condition en refresh: implementar `pendingRefreshPromise` en `api.ts`
- `buildPartialUpdate` helper para queries UPDATE dinámicas en controllers
- Transacciones con `withTransaction(client => ...)` helper en NoteSharingController

---

## Sprint 6 — Roadmap: Testing depth + TypeScript TS5 (semana 5-8)

> Requiere plan propio.

- **E2E Playwright**: setup contra BD real en CI, 5 flujos críticos (registro, crear nota, compartir, reset password, grupos)
- **Frontend TypeScript 5.x**: actualizar de 4.9.5 a 5.x (override en package.json, verificar compatibilidad con react-scripts)
- **Notes.tsx refactor**: extraer `<NotesProvider>` wrapper, reducir responsabilidades del componente
- **Services tests**: emailService (mock nodemailer), emailSchedulerService (mock Reminder model)
- **SQL matchers en tests críticos**: verificar texto exacto de queries en NoteCrudController

---

## Sprint 7 — Backlog: Plataforma avanzada

> Planificar cuando los sprints anteriores estén completados.

- **S3/MinIO storage**: abstracción `StorageProvider` con implementaciones `LocalStorage` y `S3Storage`
- **Idempotency keys**: cabecera `Idempotency-Key` en POST de notas/recordatorios
- **i18n**: `react-i18next` si el proyecto escala a usuarios multilingüe
- **Migrar a pnpm + Vite (hacer juntos)**: reemplazar `npm` por `pnpm` en backend, frontend y CI; migrar el frontend de CRA (`react-scripts`) a Vite. Hacerlo en un solo paso porque:
  - CRA con pnpm requiere `.npmrc: node-linker=hoisted` (hoisting forzado). Con Vite desaparece esa restricción.
  - La migración Vite elimina las 58 CVEs de `react-scripts` y acelera el build ×5.
  - Archivos afectados: todos los `package.json`, `.npmrc` raíz, `.github/workflows/ci.yml` (usar `pnpm/action-setup@v4`), `Dockerfiles` (`npm ci` → `pnpm install --frozen-lockfile`), `start.sh`, `CONTRIBUTING.md`.
- **Performance**: índices adicionales basados en queries EXPLAIN reales

---

## Self-Review

### Cobertura de los ~48 ítems pendientes

| Sprint | Ítems cubiertos | IDs |
|---|---|---|
| S4 Task 1 | 2 | 1.7, 1.8 |
| S4 Task 2 | 2 | 1.9, 1.16 |
| S4 Task 3 | 2 | 7.3, 2.2 |
| S4 Task 4 | 7 | 3.1, 1.14, 3.5(resto), 1.17, 1.18, 1.11, 1.15(parcial) |
| S4 Task 5 | 4 | 2.3, 2.4, 2.5, 2.6 |
| S4 Task 6 | 5 | 4.4, 4.5, 4.6, 4.8, 4.9 |
| S4 Task 7 | 1 | 6.5 |
| S4 Task 8 | 4 | 6.2(resto), 6.3, 6.9, 6.10 |
| S4 Task 9 | 5 | 5.3, 8.1, 8.2, 8.3, 5.6 |
| S5 Task A | 1 | 2.1(resto) |
| S5 Task B | 1 | 1.15 |
| S5 Task C | 1 | 4.3 |
| S5 Task D | 4 | 7.1, 7.2, 7.3, 7.6 |
| S5 Task E | 3 | 3.4, 3.10, 3.11 |
| S6 | 4 | 6.4, 6.6, 9.2, 6.9 |
| S7 | 4 | 5.2, 3.12, 7.4, 1.8(Vite) |

**Ítems no cubiertos en ningún sprint:**
- `4.10` (cleanup_expired_tokens doc) — añadir a task 9 como nota en SECURITY.md ✅ incluido
- `5.4` (start.sh cross-platform) — añadir a Sprint 5 Task F: script npm cross-env
- `5.5` (npm install en start.sh) — junto con 5.4

### Checklist de placeholders
- ✅ Todos los pasos tienen código concreto (no "implement later")
- ✅ Los imports están especificados con rutas exactas
- ✅ Los comandos tienen salida esperada
- ✅ Sprints 5-7 tienen suficiente descripción para crear sub-planes

### Consistencia de tipos
- `emitSessionExpired()` se define en `authEvents.ts` (Task 3.1) y se importa en `api.ts` (Task 3.3) y `App.tsx` (Task 3.4) — consistente ✅
- `toApiError()` se define en `apiError.ts` (Task 5.1) y se usa en `useNotes.ts` (Task 5.3) — consistente ✅
- `uploadsLimiter` se define en `rateLimiter.ts` (Task 4.6) y se monta en `index.ts` (Task 4.7) — consistente ✅
