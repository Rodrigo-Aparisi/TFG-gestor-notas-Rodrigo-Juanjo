# Sprint 6 — Calidad: helper buildPartialUpdate + accesibilidad de modales

> **For agentic workers:** ejecución inline con commit y verificación por tarea.

**Goal:** Eliminar la duplicación de los "query builders" de UPDATE parcial en los 3 controllers de notas mediante un helper testeado y seguro, y mejorar la accesibilidad de los modales (cerrar con Escape).

**Hallazgos:** `queryHelpers.ts` ya tiene `isSafeColumnName` (guarda de nombres de columna). Los 3 controllers (`NoteCrudController.update`, `NoteSharingController.updateSharedNote`/`updateSharedNotePermissions`, `GroupNoteController.updateGroupNote`) repiten el patrón `if (x !== undefined) { push set; push value; paramCount++ }`. No hay tests sobre esos paths → se verifica en vivo con curl además de los unit tests del helper.

---

## Task 1: helper buildPartialUpdate (TDD)

**Files:** `backend/src/utils/queryHelpers.ts`, `backend/src/__tests__/queryHelpers.test.ts`

Diseño:
```typescript
export function buildPartialUpdate(
  fields: Record<string, unknown>,
  startIndex = 1
): { setClause: string; values: unknown[]; nextIndex: number } {
  const setParts: string[] = [];
  const values: unknown[] = [];
  let index = startIndex;
  for (const [column, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (!isSafeColumnName(column)) {
      throw new Error(`Nombre de columna inseguro en update parcial: ${column}`);
    }
    setParts.push(`${column} = $${index}`);
    values.push(value);
    index++;
  }
  return { setClause: setParts.join(', '), values, nextIndex: index };
}
```

Tests: omite `undefined`; numera placeholders desde `startIndex`; devuelve `nextIndex` correcto; lanza con columna insegura; caso sin campos → `setClause` vacío y `nextIndex === startIndex`.

## Task 2: aplicar a NoteCrudController.update

Mantener el comportamiento exacto (siempre añade `updated_at = NOW()`, incluso sin campos):
```typescript
const { setClause, values, nextIndex } = buildPartialUpdate({ title, content, images });
const setWithTs = setClause ? `${setClause}, updated_at = NOW()` : 'updated_at = NOW()';
values.push(id, userId);
const query = `UPDATE notes SET ${setWithTs} WHERE id = $${nextIndex} AND user_id = $${nextIndex + 1} RETURNING *`;
```

## Task 3: aplicar a GroupNoteController.updateGroupNote

Igual patrón; preserva el orden de columnas (title, content, color, images) y el WHERE `id`+`group_id`.

## Task 4: aplicar a NoteSharingController.updateSharedNote y updateSharedNotePermissions

`updateSharedNote`: campos {title, content}, mantiene el check de "sin campos" → 400. `updateSharedNotePermissions`: campos {can_edit, include_images} con startIndex=4 (ya usa $1-$3 en el WHERE).

## Task 5: verificación en vivo + suite

Con backend corriendo: crear nota, actualizarla (PUT) y comprobar 200 + cambios aplicados vía curl. Más `npx jest --no-coverage` (todos verdes).

## Task 6: accesibilidad — cerrar modales con Escape

Hook `useEscapeKey(onClose)` o handler por modal en los 5 modales (`GroupModal`, `ReminderDetail`, `AddMemberModal`, `CreateGroupModal`, `CreateNoteModal`). Aditivo, sin cambiar la lógica existente.
