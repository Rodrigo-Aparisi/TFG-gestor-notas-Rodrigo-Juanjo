/**
 * Query Helpers - SQL Injection Prevention
 *
 * Utilities for safely building dynamic SQL queries
 */

/**
 * Whitelist of allowed columns for ORDER BY clauses in notes table
 */
const ALLOWED_NOTE_ORDER_COLUMNS = [
  'created_at',
  'updated_at',
  'title',
  'is_pinned',
  'color',
] as const;

/**
 * Whitelist of allowed sort directions
 */
const ALLOWED_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

type NoteOrderColumn = (typeof ALLOWED_NOTE_ORDER_COLUMNS)[number];
type SortDirection = (typeof ALLOWED_SORT_DIRECTIONS)[number];

/**
 * Safely builds an ORDER BY clause for note queries
 *
 * @param field - The column to sort by
 * @param direction - Sort direction (ASC or DESC)
 * @returns Safe ORDER BY clause or default
 *
 * @example
 * buildOrderByClause('title', 'ASC') // Returns: "title ASC, is_pinned DESC"
 * buildOrderByClause('invalid', 'ASC') // Returns: "is_pinned DESC, created_at DESC" (default)
 */
export function buildOrderByClause(field?: string, direction?: string): string {
  // Validate and sanitize field
  const sanitizedField = field?.toLowerCase();
  const isValidField = ALLOWED_NOTE_ORDER_COLUMNS.includes(sanitizedField as NoteOrderColumn);

  // Validate and sanitize direction
  const sanitizedDirection = direction?.toUpperCase();
  const isValidDirection = ALLOWED_SORT_DIRECTIONS.includes(sanitizedDirection as SortDirection);

  // Default sorting: pinned first, then by creation date
  const defaultOrder = 'is_pinned DESC, created_at DESC';

  // If invalid field or direction, return default
  if (!isValidField || !isValidDirection) {
    console.warn(
      `Invalid ORDER BY parameters: field="${field}", direction="${direction}". Using default.`
    );
    return defaultOrder;
  }

  // Special case: if sorting by title, also consider pinned status
  if (sanitizedField === 'title') {
    return `${sanitizedField} ${sanitizedDirection}, is_pinned DESC`;
  }

  // For other fields, include secondary sort
  return `${sanitizedField} ${sanitizedDirection}, created_at DESC`;
}

/**
 * Whitelist for group notes ORDER BY
 */
const ALLOWED_GROUP_NOTE_ORDER_COLUMNS = ['created_at', 'updated_at', 'title', 'color'] as const;

type GroupNoteOrderColumn = (typeof ALLOWED_GROUP_NOTE_ORDER_COLUMNS)[number];

/**
 * Safely builds an ORDER BY clause for group note queries
 *
 * @param field - The column to sort by
 * @param direction - Sort direction (ASC or DESC)
 * @returns Safe ORDER BY clause or default
 */
export function buildGroupNoteOrderByClause(field?: string, direction?: string): string {
  const sanitizedField = field?.toLowerCase();
  const isValidField = ALLOWED_GROUP_NOTE_ORDER_COLUMNS.includes(
    sanitizedField as GroupNoteOrderColumn
  );

  const sanitizedDirection = direction?.toUpperCase();
  const isValidDirection = ALLOWED_SORT_DIRECTIONS.includes(sanitizedDirection as SortDirection);

  const defaultOrder = 'created_at DESC';

  if (!isValidField || !isValidDirection) {
    console.warn(
      `Invalid GROUP NOTE ORDER BY parameters: field="${field}", direction="${direction}". Using default.`
    );
    return defaultOrder;
  }

  return `${sanitizedField} ${sanitizedDirection}`;
}

/**
 * Whitelist for reminders ORDER BY
 */
const ALLOWED_REMINDER_ORDER_COLUMNS = ['created_at', 'updated_at', 'date_time', 'title'] as const;

type ReminderOrderColumn = (typeof ALLOWED_REMINDER_ORDER_COLUMNS)[number];

/**
 * Safely builds an ORDER BY clause for reminder queries
 *
 * @param field - The column to sort by
 * @param direction - Sort direction (ASC or DESC)
 * @returns Safe ORDER BY clause or default
 */
export function buildReminderOrderByClause(field?: string, direction?: string): string {
  const sanitizedField = field?.toLowerCase();
  const isValidField = ALLOWED_REMINDER_ORDER_COLUMNS.includes(
    sanitizedField as ReminderOrderColumn
  );

  const sanitizedDirection = direction?.toUpperCase();
  const isValidDirection = ALLOWED_SORT_DIRECTIONS.includes(sanitizedDirection as SortDirection);

  const defaultOrder = 'date_time ASC, created_at DESC';

  if (!isValidField || !isValidDirection) {
    console.warn(
      `Invalid REMINDER ORDER BY parameters: field="${field}", direction="${direction}". Using default.`
    );
    return defaultOrder;
  }

  return `${sanitizedField} ${sanitizedDirection}`;
}

/**
 * Validates if a string is a safe column name (alphanumeric + underscore only)
 *
 * @param columnName - Column name to validate
 * @returns true if safe, false otherwise
 */
export function isSafeColumnName(columnName: string): boolean {
  // Only allow alphanumeric characters and underscores
  const safePattern = /^[a-zA-Z0-9_]+$/;
  return safePattern.test(columnName);
}

/**
 * Escapes a value for use in a LIKE clause
 *
 * @param value - Value to escape
 * @returns Escaped value
 */
export function escapeLikeValue(value: string): string {
  // Escape special characters in LIKE patterns: %, _, \
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Construye la cláusula SET de un UPDATE parcial de forma segura.
 *
 * Recorre `fields` en orden de inserción, ignora los valores `undefined`
 * (campos no enviados) y genera `columna = $N` con placeholders parametrizados.
 * Los nombres de columna se validan con `isSafeColumnName` (los valores van
 * siempre parametrizados, nunca interpolados).
 *
 * @param fields - Mapa columna -> valor. Las claves `undefined` se omiten.
 * @param startIndex - Índice inicial del placeholder (por defecto 1).
 * @returns `setClause` (p. ej. "title = $1, color = $2"), `values` en el mismo
 *          orden, y `nextIndex` (siguiente placeholder libre, útil para el WHERE).
 * @throws {Error} Si alguna columna a actualizar no es un identificador seguro.
 *
 * @example
 * const { setClause, values, nextIndex } = buildPartialUpdate({ title, content });
 * values.push(id);
 * const q = `UPDATE notes SET ${setClause} WHERE id = $${nextIndex}`;
 */
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
