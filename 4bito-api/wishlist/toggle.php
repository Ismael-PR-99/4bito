<?php
require_once '../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
}


$payload = requireUserAuth();
$userId  = (int)$payload['id'];

$body      = json_decode(file_get_contents('php://input'), true) ?? [];
$productId = isset($body['productId']) ? (int)$body['productId'] : 0;
if ($productId <= 0) {
    http_response_code(400); echo json_encode(['error' => 'productId requerido']); exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $check = $db->prepare("SELECT id FROM wishlist WHERE user_id=? AND product_id=?");
    $check->execute([$userId, $productId]);
    $existing = $check->fetch();

    if ($existing) {
        $db->prepare("DELETE FROM wishlist WHERE user_id=? AND product_id=?")->execute([$userId, $productId]);
        echo json_encode(['success' => true, 'action' => 'removed', 'inWishlist' => false]);
    } else {
        $db->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?,?)")->execute([$userId, $productId]);
        echo json_encode(['success' => true, 'action' => 'added', 'inWishlist' => true]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
