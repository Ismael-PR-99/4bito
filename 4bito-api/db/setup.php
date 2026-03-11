<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . '/../config/database.php';

try {
    $db = (new Database())->getConnection();
    $msgs = [];

    // 1. Crear tabla usuarios
    $db->exec("
        CREATE TABLE IF NOT EXISTS `usuarios` (
            `id`         INT AUTO_INCREMENT PRIMARY KEY,
            `nombre`     VARCHAR(100)  NOT NULL,
            `email`      VARCHAR(150)  NOT NULL UNIQUE,
            `password`   VARCHAR(255)  NOT NULL,
            `rol`        ENUM('admin','cliente') DEFAULT 'cliente',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $msgs[] = "Tabla usuarios lista";

    // 2. Crear usuario admin si no existe
    $check = $db->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
    $check->execute([':email' => 'admin@4bito.com']);
    if (!$check->fetch()) {
        $hash = password_hash('admin123', PASSWORD_BCRYPT);
        $db->prepare("INSERT INTO usuarios (nombre, email, password, rol) VALUES ('Admin', 'admin@4bito.com', :pass, 'admin')")
           ->execute([':pass' => $hash]);
        $msgs[] = "Usuario admin creado (admin@4bito.com / admin123)";
    } else {
        $msgs[] = "Usuario admin ya existe";
    }

    echo json_encode(['ok' => true, 'mensajes' => $msgs]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
