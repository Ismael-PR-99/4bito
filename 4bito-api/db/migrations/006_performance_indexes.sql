-- 006_performance_indexes.sql
-- Índices de rendimiento + full-text search

-- pieza_semana: la query GET usa WHERE is_active = 1 AND valid_until > NOW()
CREATE INDEX IF NOT EXISTS idx_ps_active_until
    ON pieza_semana(is_active, valid_until);

-- pedidos: lookup de pedidos por email (clientes sin cuenta)
CREATE INDEX IF NOT EXISTS idx_pedidos_email
    ON pedidos(email);

-- stock_notifications: pendientes por email para unsubscribe / dedup
CREATE INDEX IF NOT EXISTS idx_sn_email_pending
    ON stock_notifications(email)
    WHERE sent = 0;

-- productos: full-text search en nombre + equipo + liga (requiere pg_trgm para ILIKE rápido
-- y tsquery para búsqueda lingüística en español)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_productos_name_trgm
    ON productos USING GIN(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_fts
    ON productos USING GIN(
        to_tsvector('spanish', name || ' ' || team || ' ' || league)
    );

-- refresh_tokens: tabla para renovación silenciosa de JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL,
    token      VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP   NOT NULL,
    revoked    SMALLINT    NOT NULL DEFAULT 0,
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rt_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_rt_user  ON refresh_tokens(user_id);

-- password_resets: tabla para recuperación de contraseña (task 4)
CREATE TABLE IF NOT EXISTS password_resets (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL,
    token      VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP   NOT NULL,
    used       SMALLINT    NOT NULL DEFAULT 0,
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pr_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_pr_user  ON password_resets(user_id);
