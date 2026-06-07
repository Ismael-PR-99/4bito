<?php
require_once '../config/bootstrap.php';

requireAdminAuth();

$body = json_decode(file_get_contents('php://input'), true) ?? [];

$productId       = isset($body['productId'])       ? (int)   $body['productId']       : 0;
$discountPercent = isset($body['discountPercent']) ? (float) $body['discountPercent'] : 0;
$finalPrice      = isset($body['finalPrice'])      ? (float) $body['finalPrice']      : 0;
$validUntil      = trim($body['validUntil'] ?? '');

if ($productId <= 0 || $discountPercent <= 0 || $discountPercent > 90 || $finalPrice <= 0 || empty($validUntil)) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos. productId, discountPercent (1-90), finalPrice y validUntil son obligatorios.']);
    exit();
}

try {
    $db = (new Database())->getConnection();
    $db->beginTransaction();

    // 1. Resetear descuento en TODOS los productos que tengan descuento activo
    $db->exec("UPDATE productos SET discounted_price = NULL, discount_percent = 0 WHERE discount_percent > 0");

    // 2. Eliminar todas las piezas anteriores (tabla limpia = solo existe una pieza siempre)
    $db->exec("DELETE FROM pieza_semana");

    // 3. Insertar la nueva pieza
    $stmt = $db->prepare("
        INSERT INTO pieza_semana (product_id, discount_percent, final_price, valid_until, is_active)
        VALUES (:pid, :dp, :fp, :vu, 1)
        RETURNING id
    ");
    $stmt->execute([
        ':pid' => $productId,
        ':dp'  => $discountPercent,
        ':fp'  => $finalPrice,
        ':vu'  => $validUntil,
    ]);
    $newId = (int)$stmt->fetchColumn();

    // 4. Aplicar el descuento al nuevo producto
    $db->prepare("UPDATE productos SET discounted_price = :dp, discount_percent = :pct WHERE id = :id")
       ->execute([':dp' => $finalPrice, ':pct' => $discountPercent, ':id' => $productId]);

    $db->commit();
    echo json_encode(['success' => true, 'piezaId' => (int) $newId]);

} catch (PDOException $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
?>
