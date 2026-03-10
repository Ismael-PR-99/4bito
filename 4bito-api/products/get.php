<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

$id = trim($_GET['id'] ?? '');

if (empty($id) || !is_numeric($id)) {
    http_response_code(400);
    echo json_encode(['error' => 'El parámetro id es obligatorio y debe ser numérico']);
    exit();
}

try {
    $db   = (new Database())->getConnection();
    $stmt = $db->prepare(
        "SELECT id, name, price, discount_percent, discounted_price, team, year, league, image_url, category, sizes, sku, rating_avg, rating_count
         FROM productos
         WHERE id = :id
         LIMIT 1"
    );
    $stmt->execute([':id' => (int) $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit();
    }

    http_response_code(200);
    echo json_encode([
        'producto' => [
            'id'              => (int) $row['id'],
            'name'            => $row['name'],
            'price'           => (float) $row['price'],
            'discountPercent' => (float) ($row['discount_percent'] ?? 0),
            'discountedPrice' => $row['discounted_price'] !== null ? (float) $row['discounted_price'] : null,
            'team'            => $row['team'],
            'year'            => (int) $row['year'],
            'league'          => $row['league'],
            'imageUrl'        => $row['image_url'],
            'category'        => $row['category'],
            'sizes'           => json_decode($row['sizes'], true) ?? [],
            'sku'             => $row['sku'] ?? null,
            'ratingAvg'       => round((float)($row['rating_avg'] ?? 0), 1),
            'ratingCount'     => (int)($row['rating_count'] ?? 0),
        ],
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>
