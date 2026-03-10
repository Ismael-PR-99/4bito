<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $m)) {
    http_response_code(401); echo json_encode(['error' => 'Token requerido']); exit;
}
$payload = verificarJWT($m[1]);
if (!$payload) { http_response_code(401); echo json_encode(['error' => 'Token inválido']); exit; }

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['endpoint'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos de suscripción requeridos']);
    exit;
}

$db = (new Database())->getConnection();

// Eliminar suscripción anterior del usuario
$db->prepare('DELETE FROM push_subscriptions WHERE user_id = ?')->execute([$payload['id']]);

// Insertar nueva
$stmt = $db->prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?)');
$stmt->execute([
    $payload['id'],
    $data['endpoint'],
    $data['keys']['p256dh'] ?? '',
    $data['keys']['auth'] ?? '',
]);

echo json_encode(['success' => true]);
