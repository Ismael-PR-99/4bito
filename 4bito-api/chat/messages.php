<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';

$convId = intval($_GET['conversationId'] ?? 0);
$after  = intval($_GET['after'] ?? 0);

if (!$convId) {
    http_response_code(400);
    echo json_encode(['error' => 'conversationId requerido']);
    exit;
}

$db = (new Database())->getConnection();

$sql = 'SELECT * FROM chat_messages WHERE conversation_id = ?';
$params = [$convId];
if ($after) {
    $sql .= ' AND id > ?';
    $params[] = $after;
}
$sql .= ' ORDER BY created_at ASC';

$stmt = $db->prepare($sql);
$stmt->execute($params);
$messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($messages);
