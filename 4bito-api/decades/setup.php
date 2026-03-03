<?php
/**
 * Script de configuración — ejecutar UNA sola vez desde el navegador:
 * http://localhost/4bito/4bito-api/decades/setup.php
 * Luego bórralo o renómbralo.
 */
require_once '../config/database.php';

$db = (new Database())->getConnection();

// Crear tabla decades
$db->exec("
    CREATE TABLE IF NOT EXISTS decades (
        id    INT AUTO_INCREMENT PRIMARY KEY,
        name  VARCHAR(10) NOT NULL UNIQUE,
        active TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

// Insertar décadas (INSERT IGNORE para no duplicar)
$db->exec("
    INSERT IGNORE INTO decades (name) VALUES
    ('70s'),
    ('80s'),
    ('90s'),
    ('00s');
");

echo json_encode(['ok' => true, 'mensaje' => 'Tabla decades creada e insertada correctamente']);
