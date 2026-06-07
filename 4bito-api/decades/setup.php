<?php
require_once '../config/bootstrap.php';
/**
 * Script de configuración — ejecutar UNA sola vez desde el navegador:
 * http://localhost:8000/decades/setup.php
 * Luego bórralo o renómbralo.
 */

$db = (new Database())->getConnection();

$db->exec("
    CREATE TABLE IF NOT EXISTS decades (
        id     SERIAL PRIMARY KEY,
        name   VARCHAR(10) NOT NULL UNIQUE,
        active SMALLINT    NOT NULL DEFAULT 1
    )
");

$db->exec("
    INSERT INTO decades (name) VALUES ('70s'),('80s'),('90s'),('00s')
    ON CONFLICT (name) DO NOTHING
");

echo json_encode(['ok' => true, 'mensaje' => 'Tabla decades creada e insertada correctamente']);
