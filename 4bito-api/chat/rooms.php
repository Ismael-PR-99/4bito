<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../middleware/admin.php';

$payload = requireAdmin();

$db = (new Database())->getConnection();

$status = $_GET['status'] ?? '';
$sql = "SELECT c.id, c.user_id, c.session_id, c.user_name, c.status, c.subject, c.admin_id, c.created_at, c.fecha_actualizacion, c.resolved_at, (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND sender = 'user' AND is_read = 0) as unread_count FROM chat_conversations c";
$params = [];

if ($status) {
    $sql .= ' WHERE c.status = ?';
    $params[] = $status;
}
$sql .= ' ORDER BY c.updated_at DESC LIMIT 50';

$stmt = $db->prepare($sql);
$stmt->execute($params);

echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
