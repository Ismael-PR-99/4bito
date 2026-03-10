-- ============================================================
-- 004 — Devoluciones, Chat de soporte, Notificaciones push
-- ============================================================

-- ── DEVOLUCIONES ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS returns_requests (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  order_id        INT NOT NULL,
  user_id         INT NOT NULL,
  products_json   JSON NOT NULL,
  reason          VARCHAR(100) NOT NULL,
  description     TEXT,
  photos_json     JSON,
  resolution      ENUM('refund','exchange') NOT NULL DEFAULT 'refund',
  status          ENUM('pending','approved','rejected','refunded','exchanged') NOT NULL DEFAULT 'pending',
  admin_notes     TEXT,
  paypal_refund_id VARCHAR(100),
  case_number     VARCHAR(30) NOT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user   (user_id),
  INDEX idx_order  (order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── CHAT ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_conversations (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT,
  session_id   VARCHAR(64) NOT NULL,
  user_name    VARCHAR(100),
  status       ENUM('active','waiting','resolved','abandoned') NOT NULL DEFAULT 'active',
  admin_id     INT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at  DATETIME,
  INDEX idx_user    (user_id),
  INDEX idx_status  (status),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender          ENUM('user','bot','admin') NOT NULL,
  sender_name     VARCHAR(100) NOT NULL DEFAULT '',
  content         TEXT NOT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conv (conversation_id),
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── NOTIFICACIONES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       TEXT NOT NULL,
  url        VARCHAR(300),
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user      (user_id),
  INDEX idx_read      (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  endpoint   TEXT NOT NULL,
  p256dh     VARCHAR(200) NOT NULL,
  auth_key   VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
