<?php
header("Content-Type: application/json; charset=UTF-8");
require_once '../config/database.php';

try {
    $db = (new Database())->getConnection();

    // Añadir created_at si no existe
    $cols = $db->query("SHOW COLUMNS FROM productos LIKE 'created_at'")->fetchAll();
    if (empty($cols)) {
        $db->exec("ALTER TABLE productos ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
        $db->exec("UPDATE productos SET created_at = NOW() WHERE created_at IS NULL");
    }

    // Añadir is_new si no existe
    $cols2 = $db->query("SHOW COLUMNS FROM productos LIKE 'is_new'")->fetchAll();
    if (empty($cols2)) {
        $db->exec("ALTER TABLE productos ADD COLUMN is_new TINYINT(1) DEFAULT 0");
    }

    http_response_code(200);
    echo json_encode(['ok' => true, 'mensaje' => 'Migración completada: columnas created_at e is_new añadidas.']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
?>
