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

$productId     = isset($body['productId'])    ? (int)$body['productId']    : 0;
$productName   = trim($body['productName']    ?? '');
$size          = trim($body['size']           ?? '');
$type          = trim($body['type']           ?? '');
$quantity      = isset($body['quantity'])     ? (int)$body['quantity']     : 0;
$previousStock = isset($body['previousStock'])? (int)$body['previousStock']: 0;
$newStock      = isset($body['newStock'])     ? (int)$body['newStock']     : 0;
$reason        = trim($body['reason']         ?? 'ajuste_manual');
$orderId       = trim($body['orderId']        ?? '') ?: null;
$adminId       = isset($body['adminId'])      ? (int)$body['adminId']      : null;

$validTypes = ['entrada','salida','ajuste','devolucion'];
if ($productId <= 0 || !$productName || !$size || !in_array($type, $validTypes, true)) {
    http_response_code(400); echo json_encode(['error' => 'Datos inválidos']); exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare(
        "INSERT INTO stock_movements
         (product_id, product_name, size, type, quantity, previous_stock, new_stock, reason, order_id, admin_id)
         VALUES (?,?,?,?,?,?,?,?,?,?)"
    );
    $stmt->execute([$productId, $productName, $size, $type, $quantity, $previousStock, $newStock, $reason, $orderId, $adminId]);
    echo json_encode(['ok' => true, 'id' => (int)$db->lastInsertId()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
