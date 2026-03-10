<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
}

require_once '../config/database.php';
require_once '../middleware/admin.php';

requireAdmin();

$body = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Validar datos ──────────────────────────────────────
$id    = isset($body['id'])    ? (int)$body['id']      : 0;
$stock = isset($body['stock']) ? (array)$body['stock']  : [];

if ($id <= 0 || empty($stock)) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos']);
    exit;
}

$db = (new Database())->getConnection();

try {
    // Obtener stock existente
    $stmt = $db->prepare("SELECT sizes FROM productos WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit;
    }

    // Construir el nuevo JSON de sizes
    $sizesActuales = json_decode($row['sizes'] ?? '[]', true) ?: [];
    $sizesMap = [];
    foreach ($sizesActuales as $sz) {
        $sizesMap[$sz['size']] = $sz['stock'];
    }

    foreach ($stock as $size => $qty) {
        $sizesMap[$size] = max(0, (int)$qty);
    }

    $sizesNuevo = array_map(
        fn($size, $s) => ['size' => $size, 'stock' => $s],
        array_keys($sizesMap),
        array_values($sizesMap)
    );

    $stmt = $db->prepare("UPDATE productos SET sizes = ? WHERE id = ?");
    $stmt->execute([json_encode($sizesNuevo), $id]);

    echo json_encode(['ok' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al actualizar stock']);
}
