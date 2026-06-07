<?php
require_once '../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
}


$body      = json_decode(file_get_contents('php://input'), true) ?? [];
$email     = filter_var(trim($body['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$productId = isset($body['productId']) ? (int)$body['productId'] : 0;
$size      = trim($body['size'] ?? '');

if (!$email || $productId <= 0 || !$size) {
    http_response_code(400); echo json_encode(['error' => 'Datos inválidos']); exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $db->prepare(
        "INSERT INTO stock_notifications (email, product_id, size) VALUES (?,?,?) ON CONFLICT DO NOTHING"
    )->execute([$email, $productId, $size]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
