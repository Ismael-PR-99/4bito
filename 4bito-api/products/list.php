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

$category = trim($_GET['category'] ?? '');

if (empty($category)) {
    http_response_code(400);
    echo json_encode(['error' => 'El parámetro category es obligatorio']);
    exit();
}

try {
    $db   = (new Database())->getConnection();
    $stmt = $db->prepare(
        "SELECT id, name, price, team, year, league, image_url, category, sizes
         FROM productos
         WHERE category = :category
         ORDER BY created_at DESC"
    );
    $stmt->execute([':category' => $category]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $productos = array_map(function ($row) {
        return [
            'id'       => (int) $row['id'],
            'name'     => $row['name'],
            'price'    => (float) $row['price'],
            'team'     => $row['team'],
            'year'     => (int) $row['year'],
            'league'   => $row['league'],
            'imageUrl' => $row['image_url'],
            'category' => $row['category'],
            'sizes'    => json_decode($row['sizes'], true) ?? [],
        ];
    }, $rows);

    http_response_code(200);
    echo json_encode(['productos' => $productos]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>
