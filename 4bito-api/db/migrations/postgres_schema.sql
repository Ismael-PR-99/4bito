-- ============================================================
-- 4BITO — Schema PostgreSQL completo
-- Base de datos: 4bito
-- Ejecutar en DBeaver contra la BD "4bito"
-- ============================================================

-- ── 000: usuarios ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id         SERIAL PRIMARY KEY,
    nombre     VARCHAR(120)  NOT NULL,
    email      VARCHAR(180)  NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,
    rol        VARCHAR(10)   NOT NULL DEFAULT 'cliente'
                   CHECK (rol IN ('cliente','admin')),
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email ON usuarios(email);

INSERT INTO usuarios (nombre, email, password, rol)
VALUES ('Admin', 'admin@4bito.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ── 001: productos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS productos (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(200)  NOT NULL,
    price      NUMERIC(10,2) NOT NULL,
    team       VARCHAR(100)  NOT NULL,
    year       SMALLINT      NOT NULL,
    league     VARCHAR(100)  NOT NULL,
    image_url  VARCHAR(500)  NOT NULL,
    category   VARCHAR(100)  NOT NULL DEFAULT 'retro-selecciones',
    sizes      JSONB         NOT NULL,
    created_at TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ── 002: pedidos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER       NULL,
    nombre_cliente        VARCHAR(120)  NOT NULL,
    email                 VARCHAR(180)  NOT NULL,
    telefono              VARCHAR(30)   NOT NULL DEFAULT '',
    direccion             VARCHAR(255)  NOT NULL,
    ciudad                VARCHAR(100)  NOT NULL,
    cp                    VARCHAR(20)   NOT NULL,
    pais                  VARCHAR(80)   NOT NULL DEFAULT 'ES',
    total                 NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estado                VARCHAR(20)   NOT NULL DEFAULT 'procesando'
                              CHECK (estado IN ('procesando','enviado','entregado','cancelado')),
    paypal_transaction_id VARCHAR(100)  NULL,
    productos_json        JSONB         NULL,
    fecha_creacion        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_estado         ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_fecha_creacion ON pedidos(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_pedidos_user   ON pedidos(user_id);

CREATE TABLE IF NOT EXISTS pedido_historial (
    id         SERIAL PRIMARY KEY,
    pedido_id  INTEGER     NOT NULL,
    estado     VARCHAR(20) NOT NULL
                   CHECK (estado IN ('procesando','enviado','entregado','cancelado')),
    fecha      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pedido ON pedido_historial(pedido_id);

-- Función reutilizable para triggers de updated_at / fecha_actualizacion
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_pedidos_updated
BEFORE UPDATE ON pedidos
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── 003: características avanzadas ──────────────────────────
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS sku              VARCHAR(30)   NULL,
    ADD COLUMN IF NOT EXISTS rating_avg       NUMERIC(3,2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rating_count     INTEGER       NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_new           SMALLINT      NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2)  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(10,2) NULL;

CREATE TABLE IF NOT EXISTS stock_alerts (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER      NOT NULL,
    product_name  VARCHAR(255) NOT NULL,
    size          VARCHAR(20)  NOT NULL,
    current_stock INTEGER      NOT NULL,
    threshold     INTEGER      NOT NULL DEFAULT 3,
    ignored       SMALLINT     NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, size, ignored)
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id             SERIAL PRIMARY KEY,
    product_id     INTEGER      NOT NULL,
    product_name   VARCHAR(255) NOT NULL,
    size           VARCHAR(20)  NOT NULL,
    type           VARCHAR(20)  NOT NULL
                       CHECK (type IN ('entrada','salida','ajuste','devolucion')),
    quantity       INTEGER      NOT NULL,
    previous_stock INTEGER      NOT NULL,
    new_stock      INTEGER      NOT NULL,
    reason         VARCHAR(100) NOT NULL DEFAULT 'ajuste_manual',
    order_id       VARCHAR(100) NULL,
    admin_id       INTEGER      NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sm_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_sm_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sm_type    ON stock_movements(type);

CREATE TABLE IF NOT EXISTS wishlist (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER   NOT NULL,
    product_id INTEGER   NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_user ON wishlist(user_id);

CREATE TABLE IF NOT EXISTS stock_notifications (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    product_id INTEGER      NOT NULL,
    size       VARCHAR(10)  NOT NULL,
    sent       SMALLINT     NOT NULL DEFAULT 0,
    sent_at    TIMESTAMP    NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (email, product_id, size, sent)
);
CREATE INDEX IF NOT EXISTS idx_sn_product_size ON stock_notifications(product_id, size);

CREATE TABLE IF NOT EXISTS reviews (
    id         SERIAL PRIMARY KEY,
    product_id INTEGER      NOT NULL,
    user_id    INTEGER      NOT NULL,
    user_name  VARCHAR(255) NOT NULL,
    rating     SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT         NOT NULL,
    verified   SMALLINT     NOT NULL DEFAULT 0,
    approved   SMALLINT     NOT NULL DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_rev_product  ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_rev_approved ON reviews(product_id, approved);

CREATE TABLE IF NOT EXISTS user_sizes (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER     NOT NULL UNIQUE,
    size_camisetas  VARCHAR(10) NULL,
    size_chaquetas  VARCHAR(10) NULL,
    size_pantalones VARCHAR(10) NULL,
    updated_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- ── 004: devoluciones, chat, notificaciones ──────────────────
CREATE TABLE IF NOT EXISTS returns_requests (
    id               SERIAL PRIMARY KEY,
    order_id         INTEGER      NOT NULL,
    user_id          INTEGER      NOT NULL,
    products_json    JSONB        NOT NULL,
    reason           VARCHAR(100) NOT NULL,
    description      TEXT,
    photos_json      JSONB,
    resolution       VARCHAR(20)  NOT NULL DEFAULT 'refund'
                         CHECK (resolution IN ('refund','exchange')),
    status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected','refunded','exchanged')),
    admin_notes      TEXT,
    paypal_refund_id VARCHAR(100),
    case_number      VARCHAR(30)  NOT NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rr_user   ON returns_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rr_order  ON returns_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_rr_status ON returns_requests(status);

CREATE OR REPLACE TRIGGER trg_returns_updated
BEFORE UPDATE ON returns_requests
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE IF NOT EXISTS chat_conversations (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER,
    session_id  VARCHAR(64)  NOT NULL,
    user_name   VARCHAR(100),
    status      VARCHAR(20)  NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','waiting','resolved','abandoned','closed')),
    subject     VARCHAR(255) DEFAULT 'Consulta general',
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_id    INTEGER,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_conv_user    ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_status  ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conv_session ON chat_conversations(session_id);

CREATE OR REPLACE TRIGGER trg_chat_conv_updated
BEFORE UPDATE ON chat_conversations
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TABLE IF NOT EXISTS chat_messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER      NOT NULL,
    sender          VARCHAR(10)  NOT NULL CHECK (sender IN ('user','bot','admin')),
    sender_name     VARCHAR(100) NOT NULL DEFAULT '',
    message         TEXT         NOT NULL,
    is_read         SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON chat_messages(conversation_id);

CREATE TABLE IF NOT EXISTS notifications (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL,
    type       VARCHAR(40)  NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT         NOT NULL,
    url        VARCHAR(300),
    is_read    SMALLINT     NOT NULL DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER,
    endpoint   TEXT         NOT NULL,
    p256dh     VARCHAR(200) NOT NULL,
    auth_key   VARCHAR(100) NOT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- ── 005: índices adicionales de productos ───────────────────
CREATE INDEX IF NOT EXISTS idx_productos_category   ON productos(category);
CREATE INDEX IF NOT EXISTS idx_productos_year       ON productos(year);
CREATE INDEX IF NOT EXISTS idx_productos_is_new     ON productos(is_new);
CREATE INDEX IF NOT EXISTS idx_productos_created_at ON productos(created_at);

-- ── 006: tablas de décadas y pieza de la semana ─────────────
CREATE TABLE IF NOT EXISTS decades (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(10) NOT NULL UNIQUE,
    active SMALLINT    NOT NULL DEFAULT 1
);
INSERT INTO decades (name) VALUES ('70s'),('80s'),('90s'),('00s')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS pieza_semana (
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER       NOT NULL,
    discount_percent NUMERIC(5,2)  NOT NULL,
    final_price      NUMERIC(10,2) NOT NULL,
    valid_until      TIMESTAMP     NOT NULL,
    is_active        SMALLINT      NOT NULL DEFAULT 1,
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ps_active ON pieza_semana(is_active);

-- ── 007: corregir constraint status en returns_requests ──────
-- El PHP usa: pending, approved, rejected, processing, completed
ALTER TABLE returns_requests
    DROP CONSTRAINT IF EXISTS returns_requests_status_check;
ALTER TABLE returns_requests
    ADD CONSTRAINT returns_requests_status_check
    CHECK (status IN ('pending','approved','rejected','processing','completed','refunded','exchanged'));
