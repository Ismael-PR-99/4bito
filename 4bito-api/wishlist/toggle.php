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
require_once '../helpers/jwt.php';

$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
if (!$authHeader && function_exists('apache_request_headers')) {
    $h = apache_request_headers();
    $authHeader = $h['Authorization'] ?? $h['authorization'] ?? null;
}
if (!$authHeader || !preg_match('/Bearer\s+(.+)/i', $authHeader, $m)) {
    http_response_code(401); echo json_encode(['error' => 'Token requerido']); exit;
}
$payload = verificarJWT(trim($m[1]));
if (!$payload) {
    http_response_code(401); echo json_encode(['error' => 'Token inválido']); exit;
}
$userId = (int)$payload['id'];

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
        echo json_encode(['action' => 'removed', 'inWishlist' => false]);
    } else {
        $db->prepare("INSERT INTO wishlist (user_id, product_id) VALUES (?,?)")->execute([$userId, $productId]);
        echo json_encode(['action' => 'added', 'inWishlist' => true]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
