<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
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
$db = (new Database())->getConnection();

if (isset($data['id'])) {
    // Marcar una notificación
    $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
    $stmt->execute([intval($data['id']), $payload['id']]);
} else {
    // Marcar todas como leídas
    $stmt = $db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0');
    $stmt->execute([$payload['id']]);
}

echo json_encode(['success' => true]);
