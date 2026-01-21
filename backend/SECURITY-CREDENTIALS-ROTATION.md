# 🔐 ROTACIÓN DE CREDENCIALES - ACCIÓN REQUERIDA

## ⚠️ URGENTE: Credenciales Expuestas Detectadas

Durante el análisis de seguridad se detectaron las siguientes credenciales **REALES** en el archivo `.env` que posiblemente hayan sido expuestas en el repositorio git.

---

## Credenciales que DEBEN Rotarse INMEDIATAMENTE

### 1. JWT_SECRET ⚠️ CRÍTICO
**Valor actual:** `tu_secreto_jwt`
**Problema:** Es un valor de ejemplo/débil

**Cómo generar uno nuevo:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Acción:**
1. Ejecutar el comando anterior
2. Copiar el resultado (128 caracteres)
3. Actualizar `JWT_SECRET` en tu `.env`

---

### 2. DB_PASSWORD ⚠️ CRÍTICO
**Valor actual:** `P0stgreOlympus_Scribe@PW4321`
**Problema:** Potencialmente expuesto en git

**Acción:**
1. Generar una nueva contraseña segura (mínimo 16 caracteres)
2. Actualizar en PostgreSQL:
   ```sql
   ALTER USER postgreolympusscribeuser WITH PASSWORD 'nueva_contraseña_segura';
   ```
3. Actualizar `DB_PASSWORD` en tu `.env`

---

### 3. EMAIL_APP_PASSWORD ⚠️ CRÍTICO
**Valor actual:** `thhdthfnouztunaa`
**Problema:** App Password de Gmail expuesto

**Acción:**
1. Ir a: https://myaccount.google.com/apppasswords
2. **REVOCAR** la app password actual (`thhdthfnouztunaa`)
3. **GENERAR** una nueva app password
4. Actualizar `EMAIL_APP_PASSWORD` en tu `.env`

---

## Verificación de Seguridad

### ✅ Checklist Post-Rotación

- [ ] JWT_SECRET rotado (nuevo valor de 128 caracteres)
- [ ] DB_PASSWORD rotado y actualizado en PostgreSQL
- [ ] EMAIL_APP_PASSWORD rotado en Google Account
- [ ] Archivo `.env` actualizado con nuevos valores
- [ ] Archivo `.env.backup` eliminado (si existe)
- [ ] Verificar aplicación funciona con nuevas credenciales
- [ ] Verificar login/registro funciona
- [ ] Verificar envío de emails funciona
- [ ] Verificar conexión a base de datos funciona

---

## ¿Por Qué Es Crítico?

Si estas credenciales fueron commiteadas a git (incluso si luego se eliminaron):
- **Cualquiera con acceso al historial** puede ver las credenciales
- **Atacantes pueden:**
  - Acceder a tu base de datos
  - Falsificar tokens JWT
  - Enviar emails desde tu cuenta

---

## Próximos Pasos Después de Rotar

1. **NUNCA** commitear archivos `.env` a git
2. Usar solo `.env.example` como plantilla
3. Compartir credenciales solo por canales seguros (1Password, LastPass, etc.)
4. Establecer calendario de rotación (cada 3-6 meses)

---

## Comandos de Referencia

### Generar JWT_SECRET seguro
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Generar contraseña aleatoria fuerte
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Verificar que .env está ignorado
```bash
git check-ignore backend/.env
# Debería mostrar: backend/.env
```

### Verificar que .env NO está en commits recientes
```bash
git log --all --full-history --oneline -- backend/.env
# Si muestra resultados, CRÍTICO: .env está en el historial
```

---

## 🆘 Si .env Está en el Historial Git

Si el comando anterior muestra commits, necesitas eliminar `.env` del historial:

**Opción 1: BFG Repo-Cleaner (Recomendado)**
```bash
# 1. Hacer backup completo del repositorio
# 2. Instalar BFG: https://rtyley.github.io/bfg-repo-cleaner/
# 3. Ejecutar:
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Opción 2: git filter-branch**
```bash
# PELIGROSO - hacer backup primero
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all
```

**⚠️ ADVERTENCIA:** Ambas opciones reescriben el historial. Coordinar con el equipo antes de ejecutar.

---

*Documento generado: 2026-01-21*
*Fase 1 - Refactorización de Seguridad*
