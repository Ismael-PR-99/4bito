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

// Requiere usuario logado
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
$userId   = (int)$payload['id'];
$userName = $payload['nombre'] ?? 'Usuario';

$body      = json_decode(file_get_contents('php://input'), true) ?? [];
$productId = isset($body['productId']) ? (int)$body['productId'] : 0;
$rating    = isset($body['rating'])    ? (int)$body['rating']    : 0;
$comment   = trim($body['comment']     ?? '');

if ($productId <= 0 || $rating < 1 || $rating > 5 || strlen($comment) < 5) {
    http_response_code(400); echo json_encode(['error' => 'Datos inválidos']); exit;
}

$database = new Database();
$db = $database->getConnection();

// Verificar compra
$purchased = false;
try {
    $stmt = $db->prepare(
        "SELECT id FROM pedidos
         WHERE user_id = ? AND estado != 'cancelado'
         AND JSON_SEARCH(productos_json, 'one', ?, NULL, '$[*].id') IS NOT NULL
         LIMIT 1"
    );
    $stmt->execute([$userId, (string)$productId]);
    $purchased = (bool)$stmt->fetch();
} catch (PDOException $e) { /* Si no existe tabla pedidos, no verificamos */ }

try {
    // Upsert: si ya dejó reseña, actualizar
    $stmt = $db->prepare(
        "INSERT INTO reviews (product_id, user_id, user_name, rating, comment, verified, approved)
         VALUES (?,?,?,?,?,?,0)
         ON DUPLICATE KEY UPDATE
         rating=VALUES(rating), comment=VALUES(comment), verified=VALUES(verified), approved=0"
    );
    $stmt->execute([$productId, $userId, $userName, $rating, $comment, $purchased ? 1 : 0]);

    echo json_encode(['ok' => true, 'pendingApproval' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
