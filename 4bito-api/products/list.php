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
$decade   = trim($_GET['decade']   ?? '');
$isNew    = isset($_GET['new']) && $_GET['new'] === '1';
$sort     = trim($_GET['sort'] ?? 'newest'); // newest | price-asc | price-desc

// Convierte "90s" → [1990, 1999], "00s" → [2000, 2009], etc.
function decadeToRange(string $dec): ?array {
    if (!preg_match('/^(\d{2})s$/', $dec, $m)) return null;
    $d    = (int) $m[1];
    $start = $d >= 70 ? 1900 + $d : 2000 + $d;
    return [$start, $start + 9];
}

try {
    $db = (new Database())->getConnection();

    $where  = [];
    $params = [];

    if (!empty($category)) {
        $where[]             = 'category = :category';
        $params[':category'] = $category;
    }

    if (!empty($decade)) {
        $range = decadeToRange($decade);
        if ($range === null) {
            http_response_code(400);
            echo json_encode(['error' => 'Formato de décade inválido (ej: 90s)']);
            exit();
        }
        $where[]              = 'year BETWEEN :year_from AND :year_to';
        $params[':year_from'] = $range[0];
        $params[':year_to']   = $range[1];
    }

    if ($isNew) {
        $where[] = '(is_new = 1 OR created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))';
    }

    $whereSQL = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

    $orderSQL = match($sort) {
        'price-asc'  => 'ORDER BY price ASC',
        'price-desc' => 'ORDER BY price DESC',
        default      => 'ORDER BY created_at DESC',
    };

    $sql  = "SELECT id, name, price, team, year, league, image_url, category, sizes, is_new, created_at
             FROM productos
             $whereSQL
             $orderSQL";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
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
            'isNew'    => (bool) $row['is_new'],
        ];
    }, $rows);

    http_response_code(200);
    echo json_encode(['productos' => $productos]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: ' . $e->getMessage()]);
}
?>
