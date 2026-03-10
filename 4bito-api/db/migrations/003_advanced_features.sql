-- ═══════════════════════════════════════════════════════
-- MIGRACIÓN 003 — Gestión avanzada de almacén,
--                mejoras consumidor y experiencia compra
-- Ejecutar en: 4bito_retro_sports
-- ═══════════════════════════════════════════════════════

-- ── Añadir columnas a productos ─────────────────────────
ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS sku          VARCHAR(50)    NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS rating_avg   DECIMAL(3,2)   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INT            NOT NULL DEFAULT 0;

-- ── Alertas de stock bajo ────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_alerts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  product_id   INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  size         VARCHAR(20)  NOT NULL,
  current_stock INT NOT NULL,
  threshold    INT NOT NULL DEFAULT 3,
  ignored      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_alert_active (product_id, size, ignored)
);

-- ── Movimientos de stock ─────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  product_id     INT          NOT NULL,
  product_name   VARCHAR(255) NOT NULL,
  size           VARCHAR(20)  NOT NULL,
  type           ENUM('entrada','salida','ajuste','devolucion') NOT NULL,
  quantity       INT          NOT NULL,
  previous_stock INT          NOT NULL,
  new_stock      INT          NOT NULL,
  reason         VARCHAR(100) NOT NULL DEFAULT 'ajuste_manual',
  order_id       VARCHAR(100) NULL,
  admin_id       INT          NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sm_product (product_id),
  INDEX idx_sm_created (created_at)
);

-- ── Lista de deseos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wish (user_id, product_id),
  INDEX idx_wish_user (user_id)
);

-- ── Notificaciones de stock agotado ─────────────────────
CREATE TABLE IF NOT EXISTS stock_notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  product_id INT          NOT NULL,
  size       VARCHAR(20)  NOT NULL,
  sent       TINYINT(1)   NOT NULL DEFAULT 0,
  sent_at    TIMESTAMP    NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sn_product_size (product_id, size),
  UNIQUE KEY uq_notif (email, product_id, size, sent)
);

-- ── Reseñas ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT          NOT NULL,
  user_id     INT          NOT NULL,
  user_name   VARCHAR(255) NOT NULL,
  rating      TINYINT      NOT NULL,
  comment     TEXT         NOT NULL,
  verified    TINYINT(1)   NOT NULL DEFAULT 0,
  approved    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rev_product (product_id),
  UNIQUE KEY uq_review (user_id, product_id),
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5)
);

-- ── Tallas guardadas por usuario ─────────────────────────
CREATE TABLE IF NOT EXISTS user_sizes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT         NOT NULL UNIQUE,
  size_camisetas  VARCHAR(10) NULL,
  size_chaquetas  VARCHAR(10) NULL,
  size_pantalones VARCHAR(10) NULL,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
