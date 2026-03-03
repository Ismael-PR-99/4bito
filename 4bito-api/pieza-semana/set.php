<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../config/database.php';
require_once '../middleware/auth.php';

// Solo admin puede establecer la pieza de la semana
$user = requireAuth();
if ($user['rol'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado']);
    exit();
}

$body = json_decode(file_get_contents('php://input'), true);
$productId       = isset($body['productId'])       ? (int) $body['productId']       : 0;
$discountPercent = isset($body['discountPercent']) ? (float) $body['discountPercent'] : 0;
$finalPrice      = isset($body['finalPrice'])      ? (float) $body['finalPrice']      : 0;
$validUntil      = trim($body['validUntil'] ?? '');

if ($productId <= 0 || $discountPercent < 0 || $discountPercent > 90 || $finalPrice <= 0 || empty($validUntil)) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos. Verifica productId, discountPercent (0-90), finalPrice y validUntil.']);
    exit();
}

try {
    $db = (new Database())->getConnection();

    $db->beginTransaction();

    // 1. Desactivar piezas anteriores y resetear precios del producto actual
    $stmtPrev = $db->prepare("SELECT product_id FROM pieza_semana WHERE is_active = 1");
    $stmtPrev->execute();
    $prevPiezas = $stmtPrev->fetchAll(PDO::FETCH_ASSOC);
    foreach ($prevPiezas as $prev) {
        // Restaurar precio original del producto anterior
        $db->prepare("UPDATE productos SET discounted_price = NULL, discount_percent = 0 WHERE id = :id")
           ->execute([':id' => $prev['product_id']]);
    }

    // 2. Desactivar todas las piezas activas
    $db->exec("UPDATE pieza_semana SET is_active = 0 WHERE is_active = 1");

    // 3. Insertar la nueva pieza de la semana
    $stmt = $db->prepare("
        INSERT INTO pieza_semana (product_id, discount_percent, final_price, valid_until, is_active)
        VALUES (:pid, :dp, :fp, :vu, 1)
    ");
    $stmt->execute([
        ':pid' => $productId,
        ':dp'  => $discountPercent,
        ':fp'  => $finalPrice,
        ':vu'  => $validUntil,
    ]);
    $newId = $db->lastInsertId();

    // 4. Actualizar el producto con el precio con descuento
    $db->prepare("UPDATE productos SET discounted_price = :dp, discount_percent = :pct WHERE id = :id")
       ->execute([':dp' => $finalPrice, ':pct' => $discountPercent, ':id' => $productId]);

    $db->commit();

    echo json_encode(['ok' => true, 'piezaId' => (int) $newId]);
} catch (PDOException $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
