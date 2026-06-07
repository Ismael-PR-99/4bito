<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


$payload = requireUserAuth();
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
