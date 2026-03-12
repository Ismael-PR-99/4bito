<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';

$convId = intval($_GET['conversationId'] ?? 0);
$after  = intval($_GET['after'] ?? 0);

if (!$convId) {
    http_response_code(400);
    echo json_encode(['error' => 'conversationId requerido']);
    exit;
}

$db = (new Database())->getConnection();

// ── Verificación de acceso ──
$headers = getallheaders();
$authHeaderVal = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$jwtPayload = null;
$isAdmin = false;

if (preg_match('/Bearer\s(\S+)/', $authHeaderVal, $matches)) {
    $jwtPayload = verificarJWT($matches[1]);
    if ($jwtPayload) {
        $isAdmin = ($jwtPayload['rol'] ?? '') === 'admin';
    }
}

if (!$isAdmin) {
    $ownerStmt = $db->prepare('SELECT user_id, session_id FROM chat_conversations WHERE id = ?');
    $ownerStmt->execute([$convId]);
    $convOwner = $ownerStmt->fetch(PDO::FETCH_ASSOC);
    if (!$convOwner) {
        http_response_code(404);
        echo json_encode(['error' => 'Conversación no encontrada']);
        exit;
    }

    $sessionId = $_GET['sessionId'] ?? '';
    if ($jwtPayload) {
        if ($convOwner['user_id'] && (int)$convOwner['user_id'] !== (int)$jwtPayload['id']) {
            http_response_code(403);
            echo json_encode(['error' => 'No tienes permisos para esta conversación']);
            exit;
        }
    } else {
        if (!$sessionId || $convOwner['session_id'] !== $sessionId) {
            http_response_code(403);
            echo json_encode(['error' => 'No tienes permisos para esta conversación']);
            exit;
        }
    }
}

$sql = 'SELECT id, conversation_id, sender, sender_name, message, is_read, created_at FROM chat_messages WHERE conversation_id = ?';
$params = [$convId];
if ($after) {
    $sql .= ' AND id > ?';
    $params[] = $after;
}
$sql .= ' ORDER BY created_at ASC LIMIT 200';

$stmt = $db->prepare($sql);
$stmt->execute($params);
$messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode(['success' => true, 'data' => $messages]);
