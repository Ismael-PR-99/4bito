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

$db = (new Database())->getConnection();
$unreadOnly = ($_GET['unread'] ?? '') === '1';

$sql = 'SELECT * FROM notifications WHERE user_id = ?';
$params = [$payload['id']];
if ($unreadOnly) {
    $sql .= ' AND is_read = 0';
}
$sql .= ' ORDER BY created_at DESC LIMIT 50';

$stmt = $db->prepare($sql);
$stmt->execute($params);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
