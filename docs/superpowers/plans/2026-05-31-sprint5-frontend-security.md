# Sprint 5 — Seguridad Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sacar el access token JWT de `localStorage` (a memoria) con refresh silencioso al arrancar, y añadir defensa CSRF mediante cabecera `X-Requested-With`.

**Architecture:** El access token pasa a vivir en una variable de módulo (`tokenStore`), nunca en `localStorage`, de modo que un XSS no puede exfiltrarlo desde el almacenamiento. `AuthContext` se convierte en la única fuente de verdad de la sesión: al montar, si hay marca de sesión previa (`user` en localStorage), hace un refresh silencioso contra la cookie HttpOnly `refresh_token` para repoblar el token en memoria, mostrando un gate de carga mientras tanto. CSRF: el frontend envía `X-Requested-With: XMLHttpRequest` en todas las requests y el backend lo exige en métodos mutantes.

**Tech Stack:** React 18 + TypeScript (CRA), axios, Express + TypeScript, Jest.

**Hallazgos previos de la investigación (estado real del código):**
- El refresh token ya está en cookie HttpOnly `SameSite=Strict` (Sprint 3). El interceptor de respuesta de `api.ts` ya gestiona el 401→refresh→retry con cola de subscribers (no hay race condition).
- Existen DOS mecanismos de auth en paralelo: `authService` (+localStorage) y `AuthContext` (+estado React), y DOS hooks `useAuth` (`contexts/AuthContext.tsx` y `hooks/useAuth.ts`).
- `PrivateRoute` usa `authService.isAuthenticated()` (lee `localStorage.token`). `Login.tsx` llama a `authService.login()` directamente y NO actualiza `AuthContext`.
- Por eso, sacar el token a memoria obliga a: (1) un marcador de sesión estable que sobreviva al reload (`user` en localStorage, que NO es una credencial), (2) bootstrap refresh para repoblar el token, (3) gate de carga en `PrivateRoute`.

---

## Task 1: tokenStore en memoria

**Files:**
- Create: `frontend/src/services/tokenStore.ts`
- Test: `frontend/src/services/__tests__/tokenStore.test.ts`

- [ ] **Step 1.1 — Escribir el test que falla**

```typescript
// frontend/src/services/__tests__/tokenStore.test.ts
import { tokenStore } from '../tokenStore';

describe('tokenStore', () => {
  afterEach(() => tokenStore.clear());

  it('returns null when no token is set', () => {
    expect(tokenStore.get()).toBeNull();
  });

  it('stores and returns the access token', () => {
    tokenStore.set('abc.def.ghi');
    expect(tokenStore.get()).toBe('abc.def.ghi');
  });

  it('clears the token', () => {
    tokenStore.set('abc.def.ghi');
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });

  it('does not persist the token in localStorage', () => {
    tokenStore.set('secret-token');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
```

- [ ] **Step 1.2 — Ejecutar el test para verlo fallar**

Run: `cd frontend && npx react-scripts test --watchAll=false src/services/__tests__/tokenStore.test.ts`
Expected: FAIL — `Cannot find module '../tokenStore'`.

- [ ] **Step 1.3 — Implementar tokenStore**

```typescript
// frontend/src/services/tokenStore.ts
/**
 * In-memory store del access token JWT.
 *
 * El token vive solo en esta variable de módulo, nunca en localStorage ni
 * sessionStorage, de modo que un XSS no puede leerlo del almacenamiento del
 * navegador. Se repuebla en cada arranque mediante el refresh silencioso de
 * AuthContext (que usa la cookie HttpOnly `refresh_token`).
 */
let accessToken: string | null = null;

export const tokenStore = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};
```

- [ ] **Step 1.4 — Ejecutar el test para verlo pasar**

Run: `cd frontend && npx react-scripts test --watchAll=false src/services/__tests__/tokenStore.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 1.5 — Commit**

```bash
git add frontend/src/services/tokenStore.ts frontend/src/services/__tests__/tokenStore.test.ts
git commit -m "feat(security): tokenStore en memoria para el access token"
```

---

## Task 2: auth.ts usa tokenStore (token fuera de localStorage)

**Files:**
- Modify: `frontend/src/services/auth.ts`

Contexto: `auth.ts` hoy escribe/lee `localStorage.token` en 7 puntos (login, updateUser, logout, isAuthenticated, getToken, refreshAccessToken, initializeAuth). El `user` SÍ se mantiene en localStorage como marcador de sesión (no es una credencial).

- [ ] **Step 2.1 — Importar tokenStore al inicio de `auth.ts`**

Añadir junto a los imports existentes (debajo de `import { themeService } from './themeService';`):

```typescript
import { tokenStore } from './tokenStore';
```

- [ ] **Step 2.2 — `login`: guardar el token en memoria, no en localStorage**

Reemplazar (en el bloque `if (response.data && response.data.token)`):

```typescript
        // Guardar datos en localStorage (refreshToken va en cookie HttpOnly — no se accede desde JS)
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
```

por:

```typescript
        // Access token en memoria (no localStorage). El user queda como marcador de sesión.
        tokenStore.set(token);
        localStorage.setItem('user', JSON.stringify(user));
```

- [ ] **Step 2.3 — `updateUser`: leer el token de memoria**

Reemplazar:

```typescript
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
```

por:

```typescript
        headers: {
          Authorization: `Bearer ${tokenStore.get()}`,
        },
```

- [ ] **Step 2.4 — `logout`: limpiar el token de memoria**

Reemplazar:

```typescript
  logout: () => {
    themeService.resetToDefault();
    localStorage.removeItem('token');
    // refreshToken ya no está en localStorage — se limpia con clearCookie en el backend
    localStorage.removeItem('user');
  },
```

por:

```typescript
  logout: () => {
    themeService.resetToDefault();
    tokenStore.clear();
    // refreshToken se limpia con clearCookie en el backend
    localStorage.removeItem('user');
  },
```

- [ ] **Step 2.5 — `isAuthenticated`: basarse en el marcador de sesión `user`**

El token ya no está en localStorage, así que la presencia de sesión se determina por el `user` persistido. El token real se repuebla por el bootstrap refresh o por el interceptor 401.

Reemplazar:

```typescript
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        JSON.parse(userStr) as User; // Validate JSON
        return true;
      } catch (error) {
        console.error('Error parsing user data:', error);
        themeService.resetToDefault();
        return false;
      }
    }
    themeService.resetToDefault();
    return false;
  },
```

por:

```typescript
  isAuthenticated: (): boolean => {
    const userStr = localStorage.getItem('user');

    if (userStr) {
      try {
        JSON.parse(userStr) as User; // Validate JSON
        return true;
      } catch (error) {
        console.error('Error parsing user data:', error);
        themeService.resetToDefault();
        return false;
      }
    }
    themeService.resetToDefault();
    return false;
  },
```

- [ ] **Step 2.6 — `getToken`: devolver el token de memoria**

Reemplazar:

```typescript
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },
```

por:

```typescript
  getToken: (): string | null => {
    return tokenStore.get();
  },
```

- [ ] **Step 2.7 — `refreshAccessToken`: guardar el nuevo token en memoria**

Reemplazar:

```typescript
    const newToken = response.data.token;
    localStorage.setItem('token', newToken);
    return newToken;
```

por:

```typescript
    const newToken = response.data.token;
    tokenStore.set(newToken);
    return newToken;
```

- [ ] **Step 2.8 — `initializeAuth`: basarse en el marcador `user`**

Reemplazar:

```typescript
  initializeAuth: () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      themeService.resetToDefault();
    }
  },
```

por:

```typescript
  initializeAuth: () => {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
      themeService.resetToDefault();
    }
  },
```

- [ ] **Step 2.9 — Verificar typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 0 errores.

- [ ] **Step 2.10 — Commit**

```bash
git add frontend/src/services/auth.ts
git commit -m "feat(security): auth.ts usa tokenStore en memoria (token fuera de localStorage)"
```

---

## Task 3: AuthContext como fuente de verdad + bootstrap silent refresh

**Files:**
- Modify: `frontend/src/contexts/AuthContext.tsx`
- Test: `frontend/src/contexts/__tests__/AuthContext.test.tsx` (ajustar si rompe)

Diseño:
- El token deja de persistir en localStorage; el estado React arranca en `null`.
- `isAuthenticated` se deriva de `user` (estable entre recargas), no del token.
- Nuevo estado `loading` (true hasta que termina el bootstrap).
- Al montar: si hay `user` en localStorage, intenta `authService.refreshAccessToken()`; si funciona, repuebla el token; si falla, hace logout. Marca `loading=false` al terminar.

- [ ] **Step 3.1 — Reemplazar el cuerpo de `AuthProvider`**

Reemplazar el bloque completo desde `export const AuthProvider` hasta el cierre de la función (antes de `// Custom hook`) por:

```typescript
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // user es el marcador de sesión persistente; sobrevive a recargas.
  const [user, setUserState] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // El access token vive solo en memoria (tokenStore) + este estado React.
  const [token, setTokenState] = useState<string | null>(() => tokenStore.get());

  // loading = true mientras corre el bootstrap silent refresh al arrancar.
  const [loading, setLoading] = useState<boolean>(() => Boolean(localStorage.getItem('user')));

  // isAuthenticated se deriva del marcador de sesión, no del token (que en
  // una recarga aún no se ha repoblado en memoria).
  const isAuthenticated = Boolean(user);

  // setUser function
  const setUser = (newUser: User) => {
    setUserState(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // setToken function: memoria + estado React (NO localStorage)
  const setToken = (newToken: string) => {
    setTokenState(newToken);
    tokenStore.set(newToken);
  };

  // updateUserProfile function
  const updateUserProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUserState(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // logout function
  const logout = () => {
    setUserState(null);
    setTokenState(null);
    tokenStore.clear();
    localStorage.removeItem('user');
  };

  // Bootstrap silent refresh: al arrancar, si hay sesión previa (user en
  // localStorage) pero no token en memoria, lo repuebla usando la cookie.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!localStorage.getItem('user')) {
        setLoading(false);
        return;
      }
      try {
        const newToken = await authService.refreshAccessToken();
        if (!cancelled) setTokenState(newToken);
      } catch {
        if (!cancelled) {
          // Refresh inválido/expirado: limpiar sesión.
          setUserState(null);
          tokenStore.clear();
          localStorage.removeItem('user');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated,
    setUser,
    setToken,
    updateUserProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

- [ ] **Step 3.2 — Actualizar imports de `AuthContext.tsx`**

Reemplazar la primera línea:

```typescript
import React, { createContext, useContext, useState, ReactNode } from 'react';
```

por:

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth';
import { tokenStore } from '../services/tokenStore';
```

(mantener `import { User } from '../types';`).

- [ ] **Step 3.3 — Verificar typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 0 errores.

- [ ] **Step 3.4 — Ejecutar los tests de AuthContext y ajustar mocks**

Run: `cd frontend && npx react-scripts test --watchAll=false src/contexts/__tests__/AuthContext.test.tsx`

El test ahora monta un provider que dispara `authService.refreshAccessToken()`. Hay que mockear `authService` para que el bootstrap no haga llamadas reales. Añadir al inicio del archivo de test (tras los imports):

```typescript
jest.mock('../../services/auth', () => ({
  authService: {
    refreshAccessToken: jest.fn().mockRejectedValue(new Error('no session')),
  },
}));
```

Si algún test verificaba que `setToken` escribe en `localStorage.token`, actualizarlo: ahora `setToken` NO escribe en localStorage (el token va a `tokenStore`); el test debe comprobar `tokenStore.get()` en su lugar, importando `tokenStore`. Ajustar las aserciones afectadas y re-ejecutar hasta verde.

- [ ] **Step 3.5 — Commit**

```bash
git add frontend/src/contexts/AuthContext.tsx frontend/src/contexts/__tests__/AuthContext.test.tsx
git commit -m "feat(security): AuthContext fuente de verdad + bootstrap silent refresh"
```

---

## Task 4: PrivateRoute con gate de carga + Login conectado a AuthContext

**Files:**
- Modify: `frontend/src/components/PrivateRoute.tsx`
- Modify: `frontend/src/pages/Login.tsx`

- [ ] **Step 4.1 — PrivateRoute usa AuthContext (loading + isAuthenticated)**

Reemplazar el contenido completo de `frontend/src/components/PrivateRoute.tsx` por:

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Mientras corre el bootstrap silent refresh, no redirigir todavía.
  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-spinner" />
        <p>Cargando...</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
```

- [ ] **Step 4.2 — Login actualiza AuthContext tras autenticar**

En `frontend/src/pages/Login.tsx`, localizar el hook de auth. Si ya usa `useAuth`, reutilizarlo; si no, añadir el import y el hook.

Añadir el import (junto a los imports de la página):

```typescript
import { useAuth } from '../contexts/AuthContext';
```

Dentro del componente, cerca de los otros hooks, añadir:

```typescript
  const { setToken, setUser } = useAuth();
```

Reemplazar el bloque de éxito en `handleLogin`:

```typescript
      const response = await authService.login(loginData);
      if (response && response.token && response.user) {
        toast.success(`¡Bienvenido ${response.user.username}!`, {
          duration: 3000,
          icon: '👋'
        });
        navigate("/notes", { replace: true });
      }
```

por:

```typescript
      const response = await authService.login(loginData);
      if (response && response.token && response.user) {
        // Sincronizar AuthContext (fuente de verdad) tras el login.
        setToken(response.token);
        setUser(response.user);
        toast.success(`¡Bienvenido ${response.user.username}!`, {
          duration: 3000,
          icon: '👋'
        });
        navigate("/notes", { replace: true });
      }
```

- [ ] **Step 4.3 — Verificar typecheck**

Run: `cd frontend && npm run typecheck`
Expected: 0 errores.

- [ ] **Step 4.4 — Commit**

```bash
git add frontend/src/components/PrivateRoute.tsx frontend/src/pages/Login.tsx
git commit -m "feat(security): PrivateRoute con gate de carga y Login sincroniza AuthContext"
```

---

## Task 5: CSRF — cabecera X-Requested-With (frontend + backend)

**Files:**
- Modify: `frontend/src/services/api.ts`
- Modify: `frontend/src/services/auth.ts`
- Create: `backend/src/middleware/csrf.ts`
- Modify: `backend/src/index.ts`
- Test: `backend/src/__tests__/csrf.middleware.test.ts`

- [ ] **Step 5.1 — Frontend: enviar `X-Requested-With` en la instancia `api`**

En `frontend/src/services/api.ts`, en la creación de la instancia axios, añadir la cabecera:

```typescript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Envía cookies automáticamente (incluye refresh_token)
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});
```

- [ ] **Step 5.2 — Frontend: enviar `X-Requested-With` en la instancia de `auth.ts`**

En `frontend/src/services/auth.ts`, la instancia axios local (login/register/refresh) también debe enviar la cabecera:

```typescript
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // Send HttpOnly cookies (refresh_token) automatically
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});
```

- [ ] **Step 5.3 — Backend: escribir el test del middleware (falla primero)**

```typescript
// backend/src/__tests__/csrf.middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { requireXRequestedWith } from '../middleware/csrf';

function mockRes(): Partial<Response> {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('requireXRequestedWith', () => {
  it('permite métodos seguros (GET) sin la cabecera', () => {
    const req = { method: 'GET', headers: {} } as Request;
    const next = jest.fn();
    requireXRequestedWith(req, mockRes() as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('rechaza POST sin la cabecera con 403', () => {
    const req = { method: 'POST', headers: {} } as Request;
    const res = mockRes();
    const next = jest.fn();
    requireXRequestedWith(req, res as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite POST con la cabecera correcta', () => {
    const req = { method: 'POST', headers: { 'x-requested-with': 'XMLHttpRequest' } } as unknown as Request;
    const next = jest.fn();
    requireXRequestedWith(req, mockRes() as Response, next as NextFunction);
    expect(next).toHaveBeenCalled();
  });

  it('rechaza DELETE con cabecera incorrecta', () => {
    const req = { method: 'DELETE', headers: { 'x-requested-with': 'fetch' } } as unknown as Request;
    const res = mockRes();
    const next = jest.fn();
    requireXRequestedWith(req, res as Response, next as NextFunction);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5.4 — Ejecutar el test para verlo fallar**

Run: `cd backend && npx jest src/__tests__/csrf.middleware.test.ts --no-coverage`
Expected: FAIL — `Cannot find module '../middleware/csrf'`.

- [ ] **Step 5.5 — Implementar el middleware**

```typescript
// backend/src/middleware/csrf.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Defensa CSRF por cabecera personalizada.
 *
 * Para métodos mutantes (POST/PUT/PATCH/DELETE) exige la cabecera
 * `X-Requested-With: XMLHttpRequest`. Las cabeceras personalizadas no pueden
 * ser enviadas por un formulario HTML cross-site sin un preflight CORS, así
 * que su presencia confirma que la petición viene de nuestro SPA (mismo origen).
 * Complementa al `SameSite=Strict` del refresh token.
 *
 * Los métodos seguros (GET/HEAD/OPTIONS) se dejan pasar.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireXRequestedWith(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
    next();
    return;
  }

  res.status(403).json({ error: 'CSRF: cabecera X-Requested-With requerida', code: 'CSRF_HEADER_MISSING' });
}
```

- [ ] **Step 5.6 — Ejecutar el test para verlo pasar**

Run: `cd backend && npx jest src/__tests__/csrf.middleware.test.ts --no-coverage`
Expected: PASS (4 tests).

- [ ] **Step 5.7 — Montar el middleware en `index.ts`**

En `backend/src/index.ts`, importar el middleware y montarlo DESPUÉS de `cookieParser()` y de CORS, pero ANTES del registro de rutas de la API.

Import (junto a los otros imports de middleware):

```typescript
import { requireXRequestedWith } from './middleware/csrf';
```

Montaje (tras `app.use(cookieParser());` y la config de CORS, antes de las rutas):

```typescript
app.use(requireXRequestedWith);
```

Verificar que `/api/health` sigue accesible (es GET, lo permite el middleware).

- [ ] **Step 5.8 — Verificar typecheck + suite backend completa**

Run: `cd backend && npm run typecheck && npx jest --no-coverage`
Expected: 0 errores de tipo; todos los tests en verde (184 esperados: 180 + 4 de CSRF).

- [ ] **Step 5.9 — Commit**

```bash
git add frontend/src/services/api.ts frontend/src/services/auth.ts \
        backend/src/middleware/csrf.ts backend/src/index.ts \
        backend/src/__tests__/csrf.middleware.test.ts
git commit -m "feat(security): defensa CSRF con cabecera X-Requested-With (front + back)"
```

---

## Task 6: Verificación end-to-end manual

**Files:** ninguno (verificación)

- [ ] **Step 6.1 — Arrancar backend y frontend y validar los flujos**

Con backend (`:3001`) y frontend (`:3000`) corriendo, verificar con Playwright o manualmente:
1. Login correcto → redirige a `/notes`, se ven las notas.
2. Recargar `/notes` (F5) → NO redirige a login; el bootstrap refresh repuebla el token y la página carga.
3. `localStorage` NO contiene la clave `token` (DevTools → Application → Local Storage). Solo `user`.
4. Logout → redirige y `/notes` ya no es accesible.
5. Una request mutante sin la cabecera `X-Requested-With` (p. ej. `curl -X POST :3001/api/notes`) devuelve 403; con la cabecera y token válido, funciona.

- [ ] **Step 6.2 — Verificación de regresión**

Run: `cd frontend && npm run test:ci`
Run: `cd backend && npx jest --no-coverage`
Expected: ambas suites en verde.

---

## Self-Review

**Cobertura del alcance elegido ("Seguridad frontend"):**
- Token de acceso en memoria: Tasks 1-4.
- Bootstrap silent refresh al arrancar: Task 3.
- CSRF X-Requested-With: Task 5.

**Riesgos y mitigaciones:**
- Regresión en el flujo de login/sesión (la zona más crítica): mitigado por mantener el marcador `user`, el gate de carga en `PrivateRoute`, la sincronización explícita en `Login`, y la verificación E2E (Task 6).
- El interceptor 401→refresh existente sigue como red de seguridad si el token de memoria falta en alguna request.
- CSRF middleware global a métodos mutantes: todas las requests del SPA pasan por las instancias axios que envían la cabecera; los GET (incluido `/api/health`) se dejan pasar.

**Fuera de alcance (diferido a sprints futuros):** node-pg-migrate / unificación del doble schema, accesibilidad de modales, helpers backend (`buildPartialUpdate`, `withTransaction`).
