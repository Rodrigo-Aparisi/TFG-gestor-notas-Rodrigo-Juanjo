-- Olympus Scribe — Schema inicial
-- Ejecutado automáticamente por Docker al crear el contenedor por primera vez.
-- La base de datos ya está creada por POSTGRES_DB; no hace falta CREATE DATABASE.

-- Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Función compartida de updated_at (declarada primero porque
-- la usan los triggers de todas las tablas)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Tablas
-- ============================================================

CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    language VARCHAR(10) DEFAULT 'es',
    default_note_sort VARCHAR(20) DEFAULT 'date',
    default_note_sort_direction VARCHAR(10) DEFAULT 'desc',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

CREATE TABLE group_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_color_format_group_notes CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$')
);

CREATE TABLE notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_marked BOOLEAN DEFAULT FALSE,
    color VARCHAR(7) DEFAULT NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$')
);

CREATE TABLE note_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50) DEFAULT '#f1c40f',
    user_id UUID REFERENCES users(id),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE note_group_items (
    group_id INTEGER REFERENCES note_groups(id) ON DELETE CASCADE,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, note_id)
);

CREATE TABLE reminder_status (
    id SMALLINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO reminder_status (id, name) VALUES
    (1, 'pendiente'),
    (2, 'completado'),
    (3, 'cancelado');

CREATE TABLE reminders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_time TIMESTAMP NOT NULL,
    has_time BOOLEAN DEFAULT FALSE,
    send_email BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status_id SMALLINT REFERENCES reminder_status(id) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reminder_recurrence (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
    frequency VARCHAR(50) NOT NULL,
    interval_value INTEGER NOT NULL DEFAULT 1,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shared_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shared_with_id UUID REFERENCES users(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT FALSE,
    include_images BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_shared_note UNIQUE (note_id, shared_with_id)
);

CREATE TABLE password_reset_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE revoked_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(500) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    reason VARCHAR(100)
);

-- ============================================================
-- Índices
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_settings_user_id ON settings(user_id);

CREATE INDEX idx_user_groups_owner_id ON user_groups(owner_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_notes_group_id ON group_notes(group_id);
CREATE INDEX idx_group_notes_user_id ON group_notes(user_id);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX idx_notes_is_marked ON notes(is_marked);
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_notes_updated_at ON notes(updated_at);
CREATE INDEX idx_notes_images ON notes USING gin(images);

CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_date_time ON reminders(date_time);
CREATE INDEX idx_reminders_status ON reminders(status_id);
CREATE INDEX idx_reminder_recurrence_reminder_id ON reminder_recurrence(reminder_id);

CREATE INDEX idx_shared_notes_note_id ON shared_notes(note_id);
CREATE INDEX idx_shared_notes_owner_id ON shared_notes(owner_id);
CREATE INDEX idx_shared_notes_shared_with_id ON shared_notes(shared_with_id);
CREATE INDEX idx_shared_notes_can_edit ON shared_notes(can_edit);

CREATE INDEX idx_password_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_revoked_tokens_token ON revoked_tokens(token);
CREATE INDEX idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);

-- ============================================================
-- Triggers updated_at
-- ============================================================

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_groups_updated_at
    BEFORE UPDATE ON user_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_notes_updated_at
    BEFORE UPDATE ON group_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
    BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_recurrence_updated_at
    BEFORE UPDATE ON reminder_recurrence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_notes_updated_at
    BEFORE UPDATE ON shared_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Vistas
-- ============================================================

CREATE VIEW v_reminders AS
SELECT
    r.id, r.title, r.description, r.date_time, r.has_time,
    r.user_id, r.status_id, r.created_at, r.updated_at,
    rs.name AS status,
    rr.frequency AS recurrence_frequency,
    rr.interval_value AS recurrence_interval,
    rr.end_date AS recurrence_end_date
FROM reminders r
LEFT JOIN reminder_status rs ON r.status_id = rs.id
LEFT JOIN reminder_recurrence rr ON r.id = rr.reminder_id;

CREATE OR REPLACE VIEW v_shared_notes AS
SELECT
    sn.id AS shared_note_id,
    sn.note_id,
    n.title,
    n.content,
    CASE WHEN sn.include_images THEN n.images ELSE ARRAY[]::TEXT[] END AS images,
    n.color,
    sn.owner_id,
    owner.username AS owner_username,
    sn.shared_with_id,
    shared_with.username AS shared_with_username,
    sn.can_edit,
    sn.include_images,
    sn.created_at,
    sn.updated_at
FROM shared_notes sn
JOIN notes n ON sn.note_id = n.id
JOIN users owner ON sn.owner_id = owner.id
JOIN users shared_with ON sn.shared_with_id = shared_with.id;

CREATE VIEW v_group_notes AS
SELECT
    gn.id, gn.title, gn.content, gn.user_id,
    u.username AS created_by_username,
    gn.group_id, gn.is_pinned, gn.color, gn.images,
    gn.created_at, gn.updated_at,
    ug.name AS group_name
FROM group_notes gn
JOIN users u ON gn.user_id = u.id
JOIN user_groups ug ON gn.group_id = ug.id;

-- ============================================================
-- Función de limpieza de tokens expirados
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < NOW();
    DELETE FROM revoked_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE refresh_tokens IS 'Stores valid refresh tokens for JWT authentication';
COMMENT ON TABLE revoked_tokens IS 'Blacklist of revoked access tokens before expiration';
COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Removes expired tokens from both tables';
