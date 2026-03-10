<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once '../config/database.php';
require_once '../middleware/admin.php';

requireAdmin();

$database = new Database();
$db = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Listar reseñas pendientes de aprobación
    $status = trim($_GET['status'] ?? 'pending');
    $approved = ($status === 'approved') ? 1 : 0;

    $stmt = $db->prepare(
        "SELECT r.*, p.name as product_name
         FROM reviews r
         LEFT JOIN productos p ON p.id = r.product_id
         WHERE r.approved = ?
         ORDER BY r.created_at DESC"
    );
    $stmt->execute([$approved]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id']; $r['rating'] = (int)$r['rating'];
        $r['verified'] = (bool)(int)$r['verified'];
        $r['approved'] = (bool)(int)$r['approved'];
    }
    echo json_encode(['reviews' => $rows]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $id     = isset($body['id'])     ? (int)$body['id']   : 0;
    $action = trim($body['action']   ?? ''); // 'approve' | 'delete'

    if ($id <= 0 || !in_array($action, ['approve', 'delete'], true)) {
        http_response_code(400); echo json_encode(['error' => 'Datos inválidos']); exit;
    }

    if ($action === 'approve') {
        $db->prepare("UPDATE reviews SET approved=1 WHERE id=?")->execute([$id]);
        // Actualizar rating_avg y rating_count en productos
        $rs = $db->prepare("SELECT product_id FROM reviews WHERE id=?");
        $rs->execute([$id]);
        $pid = (int)($rs->fetchColumn() ?? 0);
        if ($pid) {
            $db->prepare(
                "UPDATE productos SET
                 rating_avg   = (SELECT AVG(rating) FROM reviews WHERE product_id=? AND approved=1),
                 rating_count = (SELECT COUNT(*)    FROM reviews WHERE product_id=? AND approved=1)
                 WHERE id=?"
            )->execute([$pid, $pid, $pid]);
        }
        echo json_encode(['ok' => true]);
    } else {
        $db->prepare("DELETE FROM reviews WHERE id=?")->execute([$id]);
        echo json_encode(['ok' => true]);
    }
    exit;
}

http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
