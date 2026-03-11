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
require_once '../helpers/jwt.php';

// Verificar token (usuario o admin)
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
if (!$authHeader && function_exists('apache_request_headers')) {
    $h = apache_request_headers();
    $authHeader = $h['Authorization'] ?? $h['authorization'] ?? null;
}
if (!$authHeader || !preg_match('/Bearer\s+(.+)/i', $authHeader, $m)) {
    http_response_code(401); echo json_encode(['error' => 'Token requerido']); exit;
}
$payload = verificarJWT(trim($m[1]));
if (!$payload) {
    http_response_code(401); echo json_encode(['error' => 'Token inválido']); exit;
}
$userId = (int)$payload['id'];

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare("SELECT product_id FROM wishlist WHERE user_id = ?");
    $stmt->execute([$userId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    if (empty($ids)) { echo json_encode(['productos' => []]); exit; }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $pStmt = $db->prepare(
        "SELECT id, name, price, discount_percent, discounted_price,
                team, year, league, image_url, category, sizes, is_new
         FROM productos WHERE id IN ($placeholders)"
    );
    $pStmt->execute($ids);
    $rows = $pStmt->fetchAll(PDO::FETCH_ASSOC);

    $productos = array_map(function($p) {
        return [
            'id'              => (int) $p['id'],
            'name'            => $p['name'],
            'price'           => (float) $p['price'],
            'discountPercent' => (float) ($p['discount_percent'] ?? 0),
            'discountedPrice' => $p['discounted_price'] !== null ? (float) $p['discounted_price'] : null,
            'team'            => $p['team'],
            'year'            => (int) $p['year'],
            'league'          => $p['league'],
            'imageUrl'        => $p['image_url'],
            'category'        => $p['category'],
            'sizes'           => json_decode($p['sizes'] ?? '[]', true),
            'isNew'           => (bool) $p['is_new'],
        ];
    }, $rows);

    echo json_encode(['productos' => $productos]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
