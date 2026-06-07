<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


$payload = requireUserAuth();

$id = intval($_GET['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

$db = (new Database())->getConnection();
$isAdmin = ($payload['rol'] ?? '') === 'admin';

if ($isAdmin) {
    $stmt = $db->prepare('SELECT r.id, r.order_id, r.user_id, r.products_json, r.reason, r.description, r.photos_json, r.resolution, r.status, r.admin_notes, r.paypal_refund_id, r.case_number, r.created_at, r.updated_at, u.nombre as user_name, u.email as user_email FROM returns_requests r LEFT JOIN usuarios u ON r.user_id = u.id WHERE r.id = ?');
    $stmt->execute([$id]);
} else {
    $stmt = $db->prepare('SELECT id, order_id, user_id, products_json, reason, description, photos_json, resolution, status, admin_notes, paypal_refund_id, case_number, created_at, updated_at FROM returns_requests WHERE id = ? AND user_id = ?');
    $stmt->execute([$id, $payload['id']]);
}

$ret = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$ret) { http_response_code(404); echo json_encode(['error' => 'No encontrado']); exit; }

$ret['products_json'] = json_decode($ret['products_json'], true);
$ret['photos_json'] = json_decode($ret['photos_json'], true);

echo json_encode(['success' => true, 'data' => $ret]);
