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

$productId = isset($_GET['product_id']) ? (int)$_GET['product_id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
if ($productId <= 0) {
    http_response_code(400); echo json_encode(['error' => 'id requerido']); exit;
}

$database = new Database();
$db = $database->getConnection();

try {
    // Verificar tabla pedidos
    try { $db->query("SELECT 1 FROM pedidos LIMIT 1"); }
    catch (PDOException $e) {
        // Fallback: misma categoría
        $cat = $db->prepare("SELECT category FROM productos WHERE id=?");
        $cat->execute([$productId]);
        $category = $cat->fetchColumn() ?? '';
        return fallbackByCategory($db, $productId, $category);
    }

    // Buscar órdenes que contienen este producto
    $stmt = $db->prepare(
        "SELECT productos_json FROM pedidos
         WHERE JSON_SEARCH(productos_json, 'one', ?, NULL, '$[*].id') IS NOT NULL
         AND estado != 'cancelado'"
    );
    $stmt->execute([(string)$productId]);
    $orders = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    if (empty($orders)) {
        // Fallback
        $cat = $db->prepare("SELECT category FROM productos WHERE id=?");
        $cat->execute([$productId]);
        $category = $cat->fetchColumn() ?? '';
        fallbackByCategory($db, $productId, $category);
        return;
    }

    // Contar co-ocurrencias
    $coOccurrences = [];
    foreach ($orders as $json) {
        $items = json_decode($json, true);
        if (!is_array($items)) continue;
        foreach ($items as $item) {
            $id = (int)($item['id'] ?? 0);
            if ($id && $id !== $productId) {
                $coOccurrences[$id] = ($coOccurrences[$id] ?? 0) + 1;
            }
        }
    }

    arsort($coOccurrences);
    $topIds = array_slice(array_keys($coOccurrences), 0, 4);

    if (empty($topIds)) {
        $cat = $db->prepare("SELECT category FROM productos WHERE id=?");
        $cat->execute([$productId]);
        $category = $cat->fetchColumn() ?? '';
        fallbackByCategory($db, $productId, $category);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($topIds), '?'));
    $pStmt = $db->prepare("SELECT id, name, price, team, year, league, image_url, category, sizes, discount_percent, discounted_price, is_new FROM productos WHERE id IN ($placeholders)");
    $pStmt->execute($topIds);
    $productos = $pStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($productos as &$p) {
        $p['id']    = (int)$p['id'];
        $p['price'] = (float)$p['price'];
        $p['year']  = (int)$p['year'];
        $p['sizes'] = json_decode($p['sizes'] ?? '[]', true);
    }

    echo json_encode(['success' => true, 'data' => $productos]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}

function fallbackByCategory($db, int $productId, string $category): void {
    $stmt = $db->prepare(
        "SELECT id, name, price, team, year, league, image_url, category, sizes, discount_percent, discounted_price, is_new FROM productos WHERE category=? AND id!=? ORDER BY RAND() LIMIT 4"
    );
    $stmt->execute([$category, $productId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$p) {
        $p['id'] = (int)$p['id']; $p['price'] = (float)$p['price'];
        $p['year'] = (int)$p['year'];
        $p['sizes'] = json_decode($p['sizes'] ?? '[]', true);
    }
    echo json_encode(['success' => true, 'data' => $rows]);
}
