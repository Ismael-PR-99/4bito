<?php
require_once '../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
}


$payload  = requireUserAuth();
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
         AND EXISTS (SELECT 1 FROM jsonb_array_elements(productos_json) AS elem WHERE (elem->>'id') = ?)
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
         ON CONFLICT (user_id, product_id) DO UPDATE SET
         rating=EXCLUDED.rating, comment=EXCLUDED.comment, verified=EXCLUDED.verified, approved=0"
    );
    $stmt->execute([$productId, $userId, $userName, $rating, $comment, $purchased ? 1 : 0]);

    echo json_encode(['success' => true, 'data' => ['pendingApproval' => true]]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
