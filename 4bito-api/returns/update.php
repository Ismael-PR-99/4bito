<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../middleware/admin.php';

$payload = requireAdmin();

$data = json_decode(file_get_contents('php://input'), true);
$id     = intval($data['id'] ?? 0);
$status = trim($data['status'] ?? '');
$adminNotes = trim($data['admin_notes'] ?? '');

$validStatuses = ['pending', 'approved', 'rejected', 'processing', 'completed'];
if (!$id || !in_array($status, $validStatuses)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID y status válido requeridos']);
    exit;
}

$db = (new Database())->getConnection();

$stmt = $db->prepare('SELECT id, order_id, user_id, status, resolution, products_json, case_number FROM returns_requests WHERE id = ?');
$stmt->execute([$id]);
$ret = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$ret) { http_response_code(404); echo json_encode(['error' => 'No encontrado']); exit; }

$fields = ['status = ?'];
$params = [$status];

if ($adminNotes) {
    $fields[] = 'admin_notes = ?';
    $params[] = $adminNotes;
}
if ($status === 'completed') {
    $fields[] = 'completed_at = NOW()';
}

$params[] = $id;
$stmt = $db->prepare('UPDATE returns_requests SET ' . implode(', ', $fields) . ' WHERE id = ?');
$stmt->execute($params);

// Crear notificación para el usuario
$titles = [
    'approved'   => 'Devolución aprobada',
    'rejected'   => 'Devolución rechazada',
    'processing' => 'Devolución en proceso',
    'completed'  => 'Devolución completada',
];
$bodies = [
    'approved'   => 'Tu devolución ' . $ret['case_number'] . ' ha sido aprobada.',
    'rejected'   => 'Tu devolución ' . $ret['case_number'] . ' ha sido rechazada.',
    'processing' => 'Tu devolución ' . $ret['case_number'] . ' está siendo procesada.',
    'completed'  => 'Tu devolución ' . $ret['case_number'] . ' se ha completado.',
];

if (isset($titles[$status])) {
    $stmt2 = $db->prepare('INSERT INTO notifications (user_id, type, title, body, url) VALUES (?, "return", ?, ?, ?)');
    $stmt2->execute([
        $ret['user_id'],
        $titles[$status],
        $bodies[$status],
        '/perfil',
    ]);
}

echo json_encode(['success' => true, 'data' => ['message' => 'Estado actualizado']]);
