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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de notas
CREATE TABLE notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para notas
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_users_email ON users(email);

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

-- Crear índices para mejorar el rendimiento
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
CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_recurrence_updated_at
    BEFORE UPDATE ON reminder_recurrence
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Crear vista para facilitar las consultas
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

-- Agregar permisos necesarios
GRANT SELECT, INSERT, UPDATE, DELETE ON reminders TO postgres;
GRANT SELECT ON reminder_status TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON reminder_recurrence TO postgres;
GRANT SELECT ON v_reminders TO postgres;
