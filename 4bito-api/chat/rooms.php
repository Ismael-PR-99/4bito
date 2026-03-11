<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../middleware/admin.php';

$payload = requireAdmin();

$db = (new Database())->getConnection();

$status = $_GET['status'] ?? '';
$sql = 'SELECT c.*, (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND sender = "user" AND is_read = 0) as unread_count FROM chat_conversations c';
$params = [];

if ($status) {
    $sql .= ' WHERE c.status = ?';
    $params[] = $status;
}
$sql .= ' ORDER BY c.updated_at DESC';

$stmt = $db->prepare($sql);
$stmt->execute($params);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
