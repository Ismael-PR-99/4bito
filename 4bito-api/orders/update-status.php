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
$id     = isset($body['id'])     ? (int)$body['id']   : 0;
$estado = isset($body['estado']) ? trim($body['estado']) : '';

$estadosValidos = ['procesando', 'enviado', 'entregado', 'cancelado'];
if ($id <= 0 || !in_array($estado, $estadosValidos, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos']);
    exit;
}

$db = (new Database())->getConnection();

try {
    $db->beginTransaction();

    // Actualizar estado del pedido
    $stmt = $db->prepare("UPDATE pedidos SET estado = ? WHERE id = ?");
    $stmt->execute([$estado, $id]);

    if ($stmt->rowCount() === 0) {
        $db->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Pedido no encontrado']);
        exit;
    }

    // Insertar en historial (si existe la tabla)
    try {
        $hStmt = $db->prepare("INSERT INTO pedido_historial (pedido_id, estado, fecha) VALUES (?, ?, NOW())");
        $hStmt->execute([$id, $estado]);
    } catch (PDOException $histEx) {
        // La tabla historial es opcional — continuar sin error
    }

    $db->commit();
    echo json_encode(['ok' => true]);

} catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Error al actualizar estado']);
}
