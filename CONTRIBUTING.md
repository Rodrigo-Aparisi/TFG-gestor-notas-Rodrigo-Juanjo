# Contributing to Olympus Scribe

## Requisitos previos

- Node.js >= 18, npm >= 9, PostgreSQL >= 14 (ver [README.md](README.md))

## Setup

1. Backend:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # rellena los valores (DB_*, JWT_SECRET, EMAIL_*)
   ```
2. Levanta PostgreSQL con Docker (opcional si ya tienes una instancia local):
   ```bash
   docker compose up -d postgres
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   echo "REACT_APP_API_URL=http://localhost:3001/api" > .env
   ```

## Workflow de desarrollo

1. Crea una rama desde `main`: `git checkout -b feat/mi-feature`
2. Desarrolla con TDD: escribe los tests primero.
3. Verifica antes de subir (en `backend/`): `npm run typecheck && npm test && npm run lint`
4. Abre un PR a `main`. El pipeline de CI debe estar en verde.

## Comandos disponibles

### Backend

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor con hot-reload (nodemon) |
| `npm start` | Servidor con ts-node |
| `npm test` | Tests unitarios (Jest) |
| `npm run test:ci` | Tests con cobertura |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Prettier (escritura) |
| `npm run build` | Compila a `dist/` |

### Frontend

| Comando | Acción |
|---|---|
| `npm start` | Dev server (CRA) |
| `npm run test:ci` | Tests con cobertura |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Prettier (escritura) |
| `npm run build` | Build de producción |

## Estándares de código

- TypeScript strict mode obligatorio (backend y frontend ya en `strict: true`).
- Tests para cada nueva función de negocio.
- Sin `console.log`: usa `logger` (backend) o `clientLogger` (frontend).
- Commits convencionales: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
- El hook de pre-commit (Husky + lint-staged) formatea con Prettier automáticamente.
