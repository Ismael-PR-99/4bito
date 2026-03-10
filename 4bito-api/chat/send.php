<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) { http_response_code(400); echo json_encode(['error' => 'Body requerido']); exit; }

$convId  = intval($data['conversationId'] ?? 0);
$message = trim($data['message'] ?? '');
$sender  = $data['sender'] ?? 'user';

if (!$convId || !$message) {
    http_response_code(400);
    echo json_encode(['error' => 'conversationId y message requeridos']);
    exit;
}

$validSenders = ['user', 'admin', 'bot'];
if (!in_array($sender, $validSenders)) {
    http_response_code(400);
    echo json_encode(['error' => 'Sender inválido']);
    exit;
}

$db = (new Database())->getConnection();

// Verificar conversación existe
$stmt = $db->prepare('SELECT id, status FROM chat_conversations WHERE id = ?');
$stmt->execute([$convId]);
$conv = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$conv) {
    http_response_code(404);
    echo json_encode(['error' => 'Conversación no encontrada']);
    exit;
}

$stmt = $db->prepare('INSERT INTO chat_messages (conversation_id, sender, message) VALUES (?, ?, ?)');
$stmt->execute([$convId, $sender, $message]);

// Actualizar timestamp de la conversación
$db->prepare('UPDATE chat_conversations SET updated_at = NOW() WHERE id = ?')->execute([$convId]);

echo json_encode([
    'success' => true,
    'messageId' => intval($db->lastInsertId()),
]);
