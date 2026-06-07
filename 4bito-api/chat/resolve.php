<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../middleware/admin.php';

$payload = requireAdmin();

$data = json_decode(file_get_contents('php://input'), true);
$convId = intval($data['conversationId'] ?? 0);
if (!$convId) {
    http_response_code(400);
    echo json_encode(['error' => 'conversationId requerido']);
    exit;
}

$db = (new Database())->getConnection();

$stmt = $db->prepare("UPDATE chat_conversations SET status = 'closed', admin_id = ? WHERE id = ?");
$stmt->execute([$payload['id'], $convId]);

// Marcar mensajes como leídos
$db->prepare("UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender = 'user'")->execute([$convId]);

echo json_encode(['success' => true, 'message' => 'Conversación cerrada']);
