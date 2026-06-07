<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


$payload = requireUserAuth();
$db = (new Database())->getConnection();
$unreadOnly = ($_GET['unread'] ?? '') === '1';

$sql = 'SELECT id, user_id, type, title, body, url, is_read, created_at FROM notifications WHERE user_id = ?';
$params = [$payload['id']];
if ($unreadOnly) {
    $sql .= ' AND is_read = 0';
}
$sql .= ' ORDER BY created_at DESC LIMIT 50';

$stmt = $db->prepare($sql);
$stmt->execute($params);

echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
