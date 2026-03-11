<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';

$data = json_decode(file_get_contents('php://input'), true);

$db = (new Database())->getConnection();

// Intentar autenticación (opcional para visitantes)
$userId = null;
$userName = 'Visitante';
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
if (preg_match('/Bearer\s(\S+)/', $authHeader, $m)) {
    $payload = verificarJWT($m[1]);
    if ($payload) {
        $userId = $payload['id'];
        $userName = $payload['nombre'] ?? 'Usuario';
    }
}

$sessionId = trim($data['sessionId'] ?? '');
if (!$userId && !$sessionId) {
    $sessionId = bin2hex(random_bytes(16));
}

// Buscar conversación activa existente
if ($userId) {
    $stmt = $db->prepare('SELECT * FROM chat_conversations WHERE user_id = ? AND status != "closed" ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$userId]);
} else {
    $stmt = $db->prepare('SELECT * FROM chat_conversations WHERE session_id = ? AND status != "closed" ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$sessionId]);
}

$conv = $stmt->fetch(PDO::FETCH_ASSOC);

if ($conv) {
    echo json_encode([
        'conversationId' => intval($conv['id']),
        'sessionId' => $conv['session_id'],
        'status' => $conv['status'],
        'isNew' => false,
    ]);
    exit;
}

// Crear nueva conversación
$subject = trim($data['subject'] ?? 'Consulta general');
$newSessionId = $sessionId ?: bin2hex(random_bytes(16));

$stmt = $db->prepare('INSERT INTO chat_conversations (user_id, session_id, user_name, subject, status) VALUES (?, ?, ?, ?, "active")');
$stmt->execute([$userId, $newSessionId, $userName, $subject]);

echo json_encode([
    'conversationId' => intval($db->lastInsertId()),
    'sessionId' => $newSessionId,
    'status' => 'active',
    'isNew' => true,
]);
