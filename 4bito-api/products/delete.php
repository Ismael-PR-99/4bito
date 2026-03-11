<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../middleware/admin.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

requireAdmin();

// -- Leer body JSON o POST normal --
$body = json_decode(file_get_contents('php://input'), true);
$id   = (int) ($body['id'] ?? $_POST['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de producto no válido']);
    exit();
}

try {
    $db = (new Database())->getConnection();

    // Obtener imagen antes de borrar
    $stmt = $db->prepare("SELECT image_url FROM productos WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $producto = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$producto) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit();
    }

    // Borrar archivo físico
    $imageUrl  = $producto['image_url'];
    $uploadDir = __DIR__ . '/../../uploads/';
    $filename  = basename(parse_url($imageUrl, PHP_URL_PATH));
    $filePath  = $uploadDir . $filename;

    if ($filename && file_exists($filePath)) {
        unlink($filePath);
    }

    // Eliminar registro
    $del = $db->prepare("DELETE FROM productos WHERE id = :id");
    $del->execute([':id' => $id]);

    echo json_encode(['mensaje' => 'Producto eliminado correctamente', 'id' => $id]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
