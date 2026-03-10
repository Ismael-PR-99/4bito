-- ═══════════════════════════════════════════════════════
--  002_create_pedidos.sql
--  Tabla de pedidos + historial de cambios de estado
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pedidos (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id              INT UNSIGNED NULL,
    nombre_cliente       VARCHAR(120) NOT NULL,
    email                VARCHAR(180) NOT NULL,
    telefono             VARCHAR(30)  NOT NULL DEFAULT '',
    direccion            VARCHAR(255) NOT NULL,
    ciudad               VARCHAR(100) NOT NULL,
    cp                   VARCHAR(20)  NOT NULL,
    pais                 VARCHAR(80)  NOT NULL DEFAULT 'ES',
    total                DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado               ENUM('procesando','enviado','entregado','cancelado')
                             NOT NULL DEFAULT 'procesando',
    paypal_transaction_id VARCHAR(100) NULL,
    -- Productos como JSON: [{id, nombre, imageUrl, talla, cantidad, precio}]
    productos_json       JSON NULL,
    fecha_creacion       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_estado          (estado),
    INDEX idx_fecha_creacion  (fecha_creacion),
    INDEX idx_user            (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de cambios de estado por pedido
CREATE TABLE IF NOT EXISTS pedido_historial (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id  INT UNSIGNED NOT NULL,
    estado     ENUM('procesando','enviado','entregado','cancelado') NOT NULL,
    fecha      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pedido (pedido_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
