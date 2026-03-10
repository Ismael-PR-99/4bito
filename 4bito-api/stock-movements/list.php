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

$productId  = isset($_GET['product_id']) ? (int)$_GET['product_id'] : null;
$type       = trim($_GET['type']         ?? '');
$dateFrom   = trim($_GET['date_from']    ?? '');
$dateTo     = trim($_GET['date_to']      ?? '');
$limit      = min((int)($_GET['limit'] ?? 100), 500);
$offset     = (int)($_GET['offset']       ?? 0);

$where  = [];
$params = [];

if ($productId) { $where[] = 'product_id = ?'; $params[] = $productId; }
if ($type && in_array($type, ['entrada','salida','ajuste','devolucion'], true)) {
    $where[] = 'type = ?'; $params[] = $type;
}
if ($dateFrom) { $where[] = 'created_at >= ?'; $params[] = $dateFrom . ' 00:00:00'; }
if ($dateTo)   { $where[] = 'created_at <= ?'; $params[] = $dateTo   . ' 23:59:59'; }

$sql = "SELECT * FROM stock_movements";
if ($where) $sql .= " WHERE " . implode(' AND ', $where);
$sql .= " ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}";

try {
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id']             = (int)$r['id'];
        $r['product_id']     = (int)$r['product_id'];
        $r['quantity']       = (int)$r['quantity'];
        $r['previous_stock'] = (int)$r['previous_stock'];
        $r['new_stock']      = (int)$r['new_stock'];
    }

    // Count total
    $cntSql = "SELECT COUNT(*) FROM stock_movements";
    if ($where) $cntSql .= " WHERE " . implode(' AND ', $where);
    $cntStmt = $db->prepare($cntSql);
    $cntStmt->execute($params);
    $total = (int)$cntStmt->fetchColumn();

    echo json_encode(['movements' => $rows, 'total' => $total]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
