<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../config/database.php';

try {
    $db = (new Database())->getConnection();

    $sql = "
        SELECT ps.id, ps.product_id, ps.discount_percent, ps.final_price, ps.valid_until, ps.is_active,
               p.name, p.price AS original_price, p.image_url, p.team, p.year, p.league, p.category
        FROM pieza_semana ps
        INNER JOIN productos p ON p.id = ps.product_id
        WHERE ps.is_active = 1
        ORDER BY ps.created_at DESC
        LIMIT 1
    ";
    $stmt = $db->query($sql);
    $row  = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(['pieza' => null]);
        exit();
    }

    echo json_encode([
        'pieza' => [
            'id'              => (int) $row['id'],
            'productId'       => (int) $row['product_id'],
            'discountPercent' => (float) $row['discount_percent'],
            'finalPrice'      => (float) $row['final_price'],
            'validUntil'      => $row['valid_until'],
            'isActive'        => (bool) $row['is_active'],
            'name'            => $row['name'],
            'originalPrice'   => (float) $row['original_price'],
            'imageUrl'        => $row['image_url'],
            'team'            => $row['team'],
            'year'            => (int) $row['year'],
            'league'          => $row['league'],
            'category'        => $row['category'],
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
