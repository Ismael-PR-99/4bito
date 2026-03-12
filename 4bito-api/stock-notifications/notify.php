<?php
/**
 * Llamado internamente cuando se repone stock de un producto+talla.
 * Envía emails a todos los suscriptores y marca como sent.
 */
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
$productId   = isset($body['productId'])   ? (int)$body['productId']   : 0;
$productName = trim($body['productName']   ?? '');
$size        = trim($body['size']          ?? '');

if ($productId <= 0 || !$productName || !$size) {
    http_response_code(400); echo json_encode(['error' => 'Datos inválidos']); exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare(
        "SELECT id, email FROM stock_notifications
         WHERE product_id=? AND size=? AND sent=0"
    );
    $stmt->execute([$productId, $size]);
    $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sent = 0;
    foreach ($subs as $sub) {
        $ok = sendStockAvailableEmail($sub['email'], [
            'productName' => $productName,
            'size'        => $size,
            'productId'   => $productId,
        ]);
        if ($ok) {
            $db->prepare("UPDATE stock_notifications SET sent=1, sent_at=NOW() WHERE id=?")
               ->execute([$sub['id']]);
            $sent++;
        }
    }

    echo json_encode(['success' => true, 'notified' => $sent]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
