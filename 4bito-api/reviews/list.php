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

$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : 0;
if ($productId <= 0) {
    http_response_code(400); echo json_encode(['error' => 'product_id requerido']); exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare(
        "SELECT id, product_id, user_id, user_name, rating, comment, verified, approved, created_at
         FROM reviews
         WHERE product_id = ? AND approved = 1
         ORDER BY created_at DESC"
    );
    $stmt->execute([$productId]);
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($reviews as &$r) {
        $r['id']         = (int)$r['id'];
        $r['product_id'] = (int)$r['product_id'];
        $r['user_id']    = (int)$r['user_id'];
        $r['rating']     = (int)$r['rating'];
        $r['verified']   = (bool)(int)$r['verified'];
        $r['approved']   = (bool)(int)$r['approved'];
    }

    // Estadísticas de rating
    $statStmt = $db->prepare(
        "SELECT AVG(rating) as avg_rating, COUNT(*) as total FROM reviews WHERE product_id=? AND approved=1"
    );
    $statStmt->execute([$productId]);
    $stats = $statStmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'reviews'    => $reviews,
        'avg_rating' => round((float)($stats['avg_rating'] ?? 0), 1),
        'total'      => (int)($stats['total'] ?? 0),
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
