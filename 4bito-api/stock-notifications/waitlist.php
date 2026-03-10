<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
}

require_once '../config/database.php';
require_once '../middleware/admin.php';

requireAdmin();

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->query(
        "SELECT sn.product_id, p.name as product_name, p.imageUrl, sn.size,
                COUNT(*) as waiting_count
         FROM stock_notifications sn
         JOIN productos p ON p.id = sn.product_id
         WHERE sn.sent = 0
         GROUP BY sn.product_id, sn.size
         ORDER BY waiting_count DESC"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['product_id']    = (int)$r['product_id'];
        $r['waiting_count'] = (int)$r['waiting_count'];
    }
    echo json_encode(['waitlist' => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
