<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$id = intval($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

$db = (new Database())->getConnection();
$isAdmin = ($payload['rol'] ?? '') === 'admin';

if ($isAdmin) {
    $stmt = $db->prepare('SELECT r.*, u.nombre as user_name, u.email as user_email FROM returns_requests r LEFT JOIN usuarios u ON r.user_id = u.id WHERE r.id = ?');
    $stmt->execute([$id]);
} else {
    $stmt = $db->prepare('SELECT * FROM returns_requests WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $payload['id']]);
}

$ret = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$ret) { http_response_code(404); echo json_encode(['error' => 'No encontrado']); exit; }

$ret['products_json'] = json_decode($ret['products_json'], true);
$ret['photos_json'] = json_decode($ret['photos_json'], true);

echo json_encode($ret);
