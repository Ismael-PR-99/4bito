-- ═══════════════════════════════════════════════════════
--  000_create_usuarios.sql
--  Tabla de usuarios (clientes y admin)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usuarios (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre     VARCHAR(120)  NOT NULL,
    email      VARCHAR(180)  NOT NULL UNIQUE,
    password   VARCHAR(255)  NOT NULL,
    rol        ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar admin por defecto (password: admin123)
INSERT IGNORE INTO usuarios (nombre, email, password, rol)
VALUES ('Admin', 'admin@4bito.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
