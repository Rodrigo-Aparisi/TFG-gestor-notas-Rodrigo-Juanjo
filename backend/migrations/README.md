# Guía de Migraciones de Base de Datos - Olympus Scribe

## Resumen

Este directorio contiene las migraciones SQL necesarias para actualizar el esquema de la base de datos PostgreSQL de Olympus Scribe.

**Migración actual:** `001_add_token_tables.sql`
**Propósito:** Añadir soporte para sistema de refresh tokens y lista negra de tokens JWT

---

## ⚠️ IMPORTANTE - Leer Antes de Ejecutar

### Requisitos Previos

1. **Backup de la base de datos:**
   ```bash
   # Hacer backup completo de la base de datos
   pg_dump -U postgreolympusscribeuser -d olympus_scribe > backup_olympus_scribe_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Verificar que tienes acceso a PostgreSQL:**
   ```bash
   psql -U postgreolympusscribeuser -d olympus_scribe -c "SELECT version();"
   ```

3. **Verificar que las nuevas tablas NO existen:**
   ```sql
   -- Ejecutar en psql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('refresh_tokens', 'revoked_tokens');
   -- Resultado esperado: 0 filas (las tablas no deben existir)
   ```

---

## Cómo Aplicar la Migración 001

### Opción 1: Usando psql (Recomendado)

```bash
# Navegar al directorio de migraciones
cd backend/migrations

# Ejecutar la migración
psql -U postgreolympusscribeuser -d olympus_scribe -f 001_add_token_tables.sql

# Verificar que se ejecutó correctamente
psql -U postgreolympusscribeuser -d olympus_scribe -c "\dt refresh_tokens revoked_tokens"
```

**Resultado esperado:**
```
                  List of relations
 Schema |      Name       | Type  |         Owner
--------+-----------------+-------+------------------------
 public | refresh_tokens  | table | postgreolympusscribeuser
 public | revoked_tokens  | table | postgreolympusscribeuser
(2 rows)
```

### Opción 2: Usando PgAdmin

1. Abrir PgAdmin 4
2. Conectar al servidor PostgreSQL
3. Navegar a: Servers → PostgreSQL → Databases → olympus_scribe
4. Click derecho → **Query Tool**
5. En el Query Tool:
   - Abrir archivo: File → Open → Seleccionar `001_add_token_tables.sql`
   - Click en el botón **Execute/Refresh** (F5)
6. Verificar que se crearon las tablas:
   - Expandir: Schemas → public → Tables
   - Deberías ver: `refresh_tokens` y `revoked_tokens`

### Opción 3: Copiar y Pegar SQL

Si prefieres ejecutar manualmente:

1. Abrir `001_add_token_tables.sql` con un editor de texto
2. Copiar todo el contenido
3. Abrir un cliente SQL (psql, PgAdmin, DBeaver, etc.)
4. Pegar el SQL
5. Ejecutar

---

## Verificación Post-Migración

### 1. Verificar Estructura de Tablas

```sql
-- Ver columnas de refresh_tokens
\d refresh_tokens

-- Resultado esperado:
                                   Table "public.refresh_tokens"
   Column    |            Type             |                         Modifiers
-------------+-----------------------------+-----------------------------------------------------------
 id          | uuid                        | not null default gen_random_uuid()
 user_id     | uuid                        | not null
 token       | character varying(500)      | not null
 expires_at  | timestamp without time zone | not null
 created_at  | timestamp without time zone | default CURRENT_TIMESTAMP
Indexes:
    "refresh_tokens_pkey" PRIMARY KEY, btree (id)
    "refresh_tokens_token_key" UNIQUE CONSTRAINT, btree (token)
    "idx_refresh_tokens_expires_at" btree (expires_at)
    "idx_refresh_tokens_token" btree (token)
    "idx_refresh_tokens_user_id" btree (user_id)
Foreign-key constraints:
    "refresh_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

```sql
-- Ver columnas de revoked_tokens
\d revoked_tokens

-- Resultado esperado:
                                   Table "public.revoked_tokens"
   Column    |            Type             |                         Modifiers
-------------+-----------------------------+-----------------------------------------------------------
 id          | uuid                        | not null default gen_random_uuid()
 token       | character varying(500)      | not null
 user_id     | uuid                        | not null
 revoked_at  | timestamp without time zone | default CURRENT_TIMESTAMP
 expires_at  | timestamp without time zone | not null
 reason      | character varying(100)      |
Indexes:
    "revoked_tokens_pkey" PRIMARY KEY, btree (id)
    "revoked_tokens_token_key" UNIQUE CONSTRAINT, btree (token)
    "idx_revoked_tokens_expires_at" btree (expires_at)
    "idx_revoked_tokens_token" btree (token)
Foreign-key constraints:
    "revoked_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

### 2. Verificar Función de Limpieza

```sql
-- Verificar que la función existe
SELECT proname, prosrc FROM pg_proc WHERE proname = 'cleanup_expired_tokens';

-- Probar la función (ejecutar limpieza manualmente)
SELECT cleanup_expired_tokens();
-- Resultado esperado: (1 row) - indica que se ejecutó correctamente
```

### 3. Test Básico de Funcionalidad

```sql
-- Test 1: Insertar un token de prueba
INSERT INTO refresh_tokens (user_id, token, expires_at)
VALUES (
    (SELECT id FROM users LIMIT 1), -- Toma el ID del primer usuario
    'test_token_12345',
    NOW() + INTERVAL '7 days'
);

-- Test 2: Verificar que se insertó
SELECT * FROM refresh_tokens WHERE token = 'test_token_12345';

-- Test 3: Limpiar el test
DELETE FROM refresh_tokens WHERE token = 'test_token_12345';
```

---

## Qué Hace Esta Migración

### Tabla `refresh_tokens`

Almacena los refresh tokens válidos para permitir que los usuarios renueven sus access tokens sin volver a hacer login.

**Características:**
- Cada refresh token es único
- Se asocia a un usuario específico
- Tiene fecha de expiración (configurado a 7 días en el código)
- Se elimina automáticamente cuando el usuario hace logout
- Se elimina en cascada si se elimina el usuario

### Tabla `revoked_tokens`

Lista negra de access tokens que han sido revocados antes de su expiración natural (por ejemplo, al hacer logout).

**Características:**
- Almacena tokens de acceso revocados
- Incluye razón de revocación (logout, cambio de contraseña, seguridad, etc.)
- Los tokens expirados se limpian automáticamente
- Se elimina en cascada si se elimina el usuario

### Función `cleanup_expired_tokens()`

Función auxiliar para limpiar tokens expirados de ambas tablas.

**Uso manual:**
```sql
SELECT cleanup_expired_tokens();
```

**Uso automático (opcional con pg_cron):**
```sql
-- Requiere extensión pg_cron instalada
SELECT cron.schedule('cleanup-tokens', '0 3 * * *', $$SELECT cleanup_expired_tokens()$$);
-- Esto ejecutará la limpieza automáticamente todos los días a las 3:00 AM
```

---

## Rollback (Revertir Migración)

Si necesitas revertir la migración por alguna razón:

```sql
-- ADVERTENCIA: Esto eliminará TODOS los refresh tokens activos
-- Los usuarios tendrán que volver a hacer login

-- Eliminar tablas
DROP TABLE IF EXISTS revoked_tokens CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;

-- Eliminar función
DROP FUNCTION IF EXISTS cleanup_expired_tokens();
```

---

## Impacto en la Aplicación

### Antes de la Migración

- El backend NO funcionará correctamente con el nuevo código
- Intentos de login fallarán con error: `relation "refresh_tokens" does not exist`
- Intentos de logout fallarán con error: `relation "revoked_tokens" does not exist`

### Después de la Migración

- El backend funcionará con el sistema completo de JWT
- Los usuarios podrán:
  - Hacer login y recibir access + refresh tokens
  - Renovar su access token cuando expire (sin volver a hacer login)
  - Hacer logout correctamente (tokens revocados)
- Los tokens expirados se limpiarán automáticamente

---

## Configuración Adicional Recomendada

### 1. Instalación de pg_cron (Opcional pero Recomendado)

Para limpieza automática de tokens expirados:

```sql
-- 1. Instalar extensión (requiere permisos de superusuario)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Programar limpieza diaria a las 3 AM
SELECT cron.schedule(
    'cleanup-tokens',
    '0 3 * * *',
    $$SELECT cleanup_expired_tokens()$$
);

-- 3. Verificar que se programó correctamente
SELECT * FROM cron.job;
```

Si no puedes instalar pg_cron, puedes:
- Ejecutar `SELECT cleanup_expired_tokens();` manualmente periódicamente
- Crear un cron job del sistema que ejecute:
  ```bash
  psql -U postgreolympusscribeuser -d olympus_scribe -c "SELECT cleanup_expired_tokens();"
  ```

### 2. Monitoreo de Tokens

Query útil para monitorear tokens:

```sql
-- Ver cuántos refresh tokens activos hay
SELECT COUNT(*) as active_refresh_tokens FROM refresh_tokens WHERE expires_at > NOW();

-- Ver cuántos tokens revocados hay pendientes de limpieza
SELECT COUNT(*) as pending_cleanup FROM revoked_tokens WHERE expires_at > NOW();

-- Ver tokens expirados que pueden limpiarse
SELECT COUNT(*) as can_cleanup_refresh FROM refresh_tokens WHERE expires_at <= NOW();
SELECT COUNT(*) as can_cleanup_revoked FROM revoked_tokens WHERE expires_at <= NOW();
```

---

## Troubleshooting

### Error: "relation refresh_tokens does not exist"

**Causa:** La migración no se ha aplicado aún.
**Solución:** Ejecutar la migración según las instrucciones anteriores.

### Error: "permission denied for relation refresh_tokens"

**Causa:** El usuario de la aplicación no tiene permisos en las nuevas tablas.
**Solución:**
```sql
-- Otorgar permisos al usuario de la aplicación
GRANT ALL PRIVILEGES ON TABLE refresh_tokens TO postgreolympusscribeuser;
GRANT ALL PRIVILEGES ON TABLE revoked_tokens TO postgreolympusscribeuser;
```

### Error: "duplicate key value violates unique constraint"

**Causa:** Intento de insertar un token duplicado.
**Solución:** Este es el comportamiento esperado. El código del backend maneja esto correctamente generando un nuevo token.

### Las tablas están vacías después de la migración

**Esto es normal.** Las tablas se poblarán automáticamente cuando:
- Los usuarios hagan login (se crean refresh_tokens)
- Los usuarios hagan logout (se crean revoked_tokens)

---

## Próximas Migraciones

Para futuras migraciones, seguir este patrón:

1. Crear archivo numerado: `002_descripcion.sql`
2. Documentar en este README
3. Ejecutar en orden secuencial

---

## Soporte

Si encuentras problemas al ejecutar esta migración:

1. Verifica que el backup se haya creado correctamente
2. Revisa los logs de PostgreSQL: `/var/log/postgresql/` o usar `pg_log`
3. Si la migración falla a medias, ejecuta el rollback y vuelve a intentar
4. Consulta con el equipo antes de aplicar en producción

---

*Fecha de creación: 2026-01-21*
*Autor: Claude Code - Refactorización Fase 1*
*Estado: Listo para aplicar*
