-- Crear la base de datos
CREATE DATABASE gestor_notas;

-- Conectar a la base de datos
\c gestor_notas;

-- Habilitar la extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de usuarios
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de configuración de usuarios (settings)
CREATE TABLE settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'es',
    default_note_sort VARCHAR(20) DEFAULT 'date',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear un índice para mejorar el rendimiento en búsquedas por user_id
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- Crear tabla de notas
CREATE TABLE notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_marked BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$')
);

-- Crear tabla de etiquetas
CREATE TABLE tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#000000',
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_color_format_tags CHECK (color ~* '^#[0-9A-F]{6}$')
);

-- Crear tabla de relación entre notas y etiquetas
CREATE TABLE note_tags (
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id)
);

-- Crear índices para notas
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX idx_notes_is_marked ON notes(is_marked);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);

-- Crear tabla de estados de recordatorios
CREATE TABLE reminder_status (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

-- Insertar estados básicos
INSERT INTO reminder_status (id, name) VALUES
    (1, 'pendiente'),
    (2, 'completado'),
    (3, 'cancelado');

-- Crear tabla de recordatorios (reminders)
CREATE TABLE reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_time TIMESTAMP NOT NULL,
    has_time BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status_id SMALLINT REFERENCES reminder_status(id) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de recordatorios recurrentes
CREATE TABLE reminder_recurrence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
    frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    interval_value INTEGER NOT NULL DEFAULT 1,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para recordatorios
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_date_time ON reminders(date_time);
CREATE INDEX idx_reminders_status ON reminders(status_id);
CREATE INDEX idx_reminder_recurrence_reminder_id ON reminder_recurrence(reminder_id);

-- Crear función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_recurrence_updated_at
    BEFORE UPDATE ON reminder_recurrence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Crear vista para recordatorios
CREATE VIEW v_reminders AS
SELECT 
    r.id,
    r.title,
    r.description,
    r.date_time,
    r.has_time,
    r.user_id,
    r.status_id,
    r.created_at,
    r.updated_at,
    rs.name as status,
    rr.frequency as recurrence_frequency,
    rr.interval_value as recurrence_interval,
    rr.end_date as recurrence_end_date
FROM reminders r
LEFT JOIN reminder_status rs ON r.status_id = rs.id
LEFT JOIN reminder_recurrence rr ON r.id = rr.reminder_id;

-- Crear vista para notas con sus etiquetas
CREATE VIEW v_notes_with_tags AS
SELECT 
    n.id,
    n.title,
    n.content,
    n.user_id,
    n.is_pinned,
    n.is_marked,
    n.color,
    n.created_at,
    n.updated_at,
    ARRAY_AGG(JSONB_BUILD_OBJECT(
        'id', t.id,
        'name', t.name,
        'color', t.color
    )) FILTER (WHERE t.id IS NOT NULL) as tags
FROM notes n
LEFT JOIN note_tags nt ON n.id = nt.note_id
LEFT JOIN tags t ON nt.tag_id = t.id
GROUP BY n.id;
