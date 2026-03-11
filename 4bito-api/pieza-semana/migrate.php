<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Content-Type: application/json; charset=UTF-8");

require_once '../config/database.php';

try {
    $db = (new Database())->getConnection();
    $msgs = [];

    // 1. Añadir discount_percent a productos si no existe
    $cols = $db->query("SHOW COLUMNS FROM productos LIKE 'discount_percent'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE productos ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0 AFTER price");
        $msgs[] = "Columna discount_percent añadida a productos";
    } else {
        $msgs[] = "Columna discount_percent ya existe";
    }

    // 2. Añadir discounted_price a productos si no existe
    $cols2 = $db->query("SHOW COLUMNS FROM productos LIKE 'discounted_price'")->fetchAll();
    if (empty($cols2)) {
        $db->exec("ALTER TABLE productos ADD COLUMN discounted_price DECIMAL(10,2) DEFAULT NULL AFTER discount_percent");
        $msgs[] = "Columna discounted_price añadida a productos";
    } else {
        $msgs[] = "Columna discounted_price ya existe";
    }

    // 3. Crear tabla pieza_semana si no existe
    $db->exec("
        CREATE TABLE IF NOT EXISTS pieza_semana (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            product_id     INT NOT NULL,
            discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
            final_price    DECIMAL(10,2) NOT NULL,
            valid_until    DATETIME NOT NULL,
            is_active      TINYINT(1) NOT NULL DEFAULT 1,
            created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES productos(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
    $msgs[] = "Tabla pieza_semana lista";

    echo json_encode(['ok' => true, 'mensajes' => $msgs]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
?>
