<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
}

require_once '../config/database.php';
require_once '../middleware/admin.php';

requireAdmin();

$body = json_decode(file_get_contents('php://input'), true) ?? [];
$id   = isset($body['id']) ? (int)$body['id'] : 0;

if ($id <= 0) {
    http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare("UPDATE stock_alerts SET ignored = 1 WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['ok' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
