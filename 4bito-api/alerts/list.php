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
        "SELECT id, product_id, product_name, size, current_stock, threshold, created_at
         FROM stock_alerts
         WHERE ignored = 0
         ORDER BY created_at DESC
         LIMIT 100"
    );
    $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Convertir tipos
    foreach ($alerts as &$a) {
        $a['id']            = (int)$a['id'];
        $a['product_id']    = (int)$a['product_id'];
        $a['current_stock'] = (int)$a['current_stock'];
        $a['threshold']     = (int)$a['threshold'];
    }

    echo json_encode(['success' => true, 'data' => ['alerts' => $alerts, 'total' => count($alerts)]]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
