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
require_once '../emails/templates.php';

requireAdmin();

$body      = json_decode(file_get_contents('php://input'), true) ?? [];
$productId = isset($body['productId'])   ? (int)$body['productId']   : 0;
$productName = trim($body['productName'] ?? '');
$size        = trim($body['size']        ?? '');
$currentStock = isset($body['currentStock']) ? (int)$body['currentStock'] : 0;
$threshold    = isset($body['threshold'])    ? (int)$body['threshold']    : 3;

if ($productId <= 0 || !$productName || !$size) {
    http_response_code(400); echo json_encode(['error' => 'Datos inválidos']); exit;
}

$database = new Database();
$db = $database->getConnection();

// Insertar o actualizar alerta (solo si no existe alerta activa para este producto+talla)
try {
    $check = $db->prepare("SELECT id FROM stock_alerts WHERE product_id=? AND size=? AND ignored=0");
    $check->execute([$productId, $size]);
    if (!$check->fetch()) {
        $ins = $db->prepare(
            "INSERT INTO stock_alerts (product_id, product_name, size, current_stock, threshold) VALUES (?,?,?,?,?)"
        );
        $ins->execute([$productId, $productName, $size, $currentStock, $threshold]);

        // Enviar email al admin (ajustar el destinatario en producción)
        $adminEmail = 'admin@4bito.com';
        sendAdminLowStockEmail($adminEmail, [
            'productName'  => $productName,
            'size'         => $size,
            'currentStock' => $currentStock,
            'threshold'    => $threshold,
        ]);
    } else {
        // Actualizar stock actual en alerta existente
        $upd = $db->prepare("UPDATE stock_alerts SET current_stock=? WHERE product_id=? AND size=? AND ignored=0");
        $upd->execute([$currentStock, $productId, $size]);
    }
    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error BD: ' . $e->getMessage()]);
}
