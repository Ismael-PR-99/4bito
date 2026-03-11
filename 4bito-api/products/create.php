<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';
require_once '../middleware/admin.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit();
}

// Verificar JWT con rol admin
requireAdmin();

// -- Validar campos de texto --
$name     = trim($_POST['name']   ?? '');
$team     = trim($_POST['team']   ?? '');
$league   = trim($_POST['league'] ?? '');
$price    = $_POST['price']    ?? '';
$year     = $_POST['year']     ?? '';
$category = trim($_POST['category'] ?? '');
$sizes    = $_POST['sizes']    ?? '';   // JSON string: [{"size":"S","stock":5},...]

if (empty($name) || empty($team) || empty($league) || $price === '' || $year === '' || empty($category)) {
    http_response_code(400);
    echo json_encode(['error' => 'Los campos name, team, league, price, year y category son obligatorios']);
    exit();
}

if (!is_numeric($price) || $price < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'El precio debe ser un número positivo']);
    exit();
}

if (!is_numeric($year) || $year < 1900 || $year > 2100) {
    http_response_code(400);
    echo json_encode(['error' => 'El año debe ser un número válido']);
    exit();
}

$sizesDecoded = [];
if (!empty($sizes)) {
    $sizesDecoded = json_decode($sizes, true);
    if (!is_array($sizesDecoded)) {
        http_response_code(400);
        echo json_encode(['error' => 'El formato de sizes no es válido']);
        exit();
    }
}

// -- Subida de imagen --
if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'La imagen es obligatoria']);
    exit();
}

$uploadDir    = __DIR__ . '/../../uploads/';
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
$maxSize      = 5 * 1024 * 1024; // 5 MB

$mimeType = mime_content_type($_FILES['image']['tmp_name']);
if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Formato de imagen no permitido (jpg, png, webp)']);
    exit();
}

if ($_FILES['image']['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'La imagen supera el límite de 5 MB']);
    exit();
}

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext      = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
// Extensiones permitidas (whitelist)
$allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
if (!in_array($ext, $allowedExts, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Extensión de imagen no permitida']);
    exit();
}
$filename = 'product_' . bin2hex(random_bytes(16)) . '.' . $ext;
$destPath = $uploadDir . $filename;

if (!move_uploaded_file($_FILES['image']['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al guardar la imagen en el servidor']);
    exit();
}

$imageUrl = 'http://localhost/4bito/uploads/' . $filename;

// -- Insertar en base de datos --
try {
    $db = (new Database())->getConnection();

    $stmt = $db->prepare(
        "INSERT INTO productos (name, price, team, year, league, image_url, category, sizes)
         VALUES (:name, :price, :team, :year, :league, :image_url, :category, :sizes)"
    );

    $stmt->execute([
        ':name'      => $name,
        ':price'     => (float) $price,
        ':team'      => $team,
        ':year'      => (int) $year,
        ':league'    => $league,
        ':image_url' => $imageUrl,
        ':category'  => $category,
        ':sizes'     => json_encode($sizesDecoded),
    ]);

    $newId = (int)$db->lastInsertId();

    // Generar SKU: 4BT-[CAT]-[YEAR]-[ZERO_ID]
    $catAbbrev = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $category), 0, 3));
    $sku = sprintf('4BT-%s-%d-%04d', $catAbbrev, (int)$year, $newId);
    try {
        $db->prepare("UPDATE productos SET sku=? WHERE id=?")->execute([$sku, $newId]);
    } catch (PDOException $e) { /* columna sku puede no existir aún */ }

    http_response_code(201);
    echo json_encode([
        'mensaje'  => 'Producto creado correctamente',
        'producto' => [
            'id'       => $newId,
            'name'     => $name,
            'price'    => (float) $price,
            'team'     => $team,
            'year'     => (int) $year,
            'league'   => $league,
            'imageUrl' => $imageUrl,
            'category' => $category,
            'sizes'    => $sizesDecoded,
            'sku'      => $sku,
        ],
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
?>
