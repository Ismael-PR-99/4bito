<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


// Rate limiting: máx 30 mensajes por IP cada 5 minutos
if (!rateLimitCheck('chat_send', 30, 300)) {
    rateLimitExceeded();
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) { http_response_code(400); echo json_encode(['error' => 'Body requerido']); exit; }

$convId  = intval($data['conversationId'] ?? 0);
$message = sanitizeInput(trim($data['message'] ?? ''), 2000);
$sender  = $data['sender'] ?? 'user';

if (!$convId || !$message) {
    http_response_code(400);
    echo json_encode(['error' => 'conversationId y message requeridos']);
    exit;
}

$validSenders = ['user', 'admin'];
if (!in_array($sender, $validSenders)) {
    http_response_code(400);
    echo json_encode(['error' => 'Sender inválido']);
    exit;
}

$db = (new Database())->getConnection();

// ── Autenticación según sender ──
$headers = getallheaders();
$authHeaderVal = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$jwtPayload = null;
if (preg_match('/Bearer\s(\S+)/', $authHeaderVal, $matches)) {
    $jwtPayload = verificarJWT($matches[1]);
}

if ($sender === 'admin') {
    if (!$jwtPayload || ($jwtPayload['rol'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Se requiere autenticación admin']);
        exit;
    }
} elseif ($sender === 'user') {
    if (!$jwtPayload) {
        http_response_code(401);
        echo json_encode(['error' => 'Token requerido']);
        exit;
    }
}

// Verificar conversación existe
$stmt = $db->prepare('SELECT id, status, user_id FROM chat_conversations WHERE id = ?');
$stmt->execute([$convId]);
$conv = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$conv) {
    http_response_code(404);
    echo json_encode(['error' => 'Conversación no encontrada']);
    exit;
}

// Verificar propiedad de la conversación para usuario
if ($sender === 'user' && $conv['user_id'] && (int)$conv['user_id'] !== (int)$jwtPayload['id']) {
    http_response_code(403);
    echo json_encode(['error' => 'No tienes permisos para esta conversación']);
    exit;
}

$stmt = $db->prepare('INSERT INTO chat_messages (conversation_id, sender, message) VALUES (?, ?, ?) RETURNING id');
$stmt->execute([$convId, $sender, $message]);
$messageId = (int)$stmt->fetchColumn();

$db->prepare('UPDATE chat_conversations SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?')->execute([$convId]);

echo json_encode([
    'success' => true,
    'messageId' => $messageId,
]);
