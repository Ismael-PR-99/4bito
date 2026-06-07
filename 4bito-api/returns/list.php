<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


$payload = requireUserAuth();

$db = (new Database())->getConnection();
$isAdmin = ($payload['rol'] ?? '') === 'admin';

if ($isAdmin) {
    $status = $_GET['status'] ?? '';
    $sql = 'SELECT r.id, r.order_id, r.user_id, r.products_json, r.reason, r.description, r.photos_json, r.resolution, r.status, r.admin_notes, r.paypal_refund_id, r.case_number, r.created_at, r.updated_at, u.nombre as user_name, u.email as user_email FROM returns_requests r LEFT JOIN usuarios u ON r.user_id = u.id';
    $params = [];
    if ($status) {
        $sql .= ' WHERE r.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY r.created_at DESC LIMIT 50';
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
} else {
    $stmt = $db->prepare('SELECT id, order_id, user_id, products_json, reason, description, photos_json, resolution, status, admin_notes, paypal_refund_id, case_number, created_at, updated_at FROM returns_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50');
    $stmt->execute([$payload['id']]);
}

$returns = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($returns as &$r) {
    $r['products_json'] = json_decode($r['products_json'], true);
    $r['photos_json'] = json_decode($r['photos_json'], true);
}

echo json_encode(['success' => true, 'data' => $returns]);
