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

requireAdmin();

// -- Campos obligatorios (vienen por multipart/form-data) --
$id     = (int) ($_POST['id']     ?? 0);
$name   = trim($_POST['name']   ?? '');
$team   = trim($_POST['team']   ?? '');
$league = trim($_POST['league'] ?? '');
$price  = $_POST['price'] ?? '';
$year   = $_POST['year']  ?? '';
$sizes  = $_POST['sizes'] ?? '';

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de producto no válido']);
    exit();
}

if (empty($name) || empty($team) || empty($league) || $price === '' || $year === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Los campos name, team, league, price y year son obligatorios']);
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
        echo json_encode(['error' => 'Formato de sizes no válido']);
        exit();
    }
}

try {
    $db = (new Database())->getConnection();

    // Obtener imagen actual
    $stmt = $db->prepare("SELECT image_url FROM productos WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit();
    }

    $imageUrl  = $row['image_url'];
    $uploadDir = __DIR__ . '/../../uploads/';

    // -- Si se sube nueva imagen --
    if (!empty($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        $maxSize      = 5 * 1024 * 1024;

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

        // Guardar nueva imagen
        $ext      = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
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
            echo json_encode(['error' => 'Error al guardar la imagen']);
            exit();
        }

        // Borrar imagen anterior
        $oldFilename = basename(parse_url($imageUrl, PHP_URL_PATH));
        $oldPath     = $uploadDir . $oldFilename;
        if ($oldFilename && file_exists($oldPath)) {
            unlink($oldPath);
        }

        $imageUrl = 'http://localhost/4bito/uploads/' . $filename;
    }

    // -- Actualizar registro --
    $upd = $db->prepare(
        "UPDATE productos
         SET name = :name, price = :price, team = :team, year = :year,
             league = :league, image_url = :image_url, sizes = :sizes
         WHERE id = :id"
    );
    $upd->execute([
        ':name'      => $name,
        ':price'     => (float) $price,
        ':team'      => $team,
        ':year'      => (int) $year,
        ':league'    => $league,
        ':image_url' => $imageUrl,
        ':sizes'     => json_encode($sizesDecoded),
        ':id'        => $id,
    ]);

    // Devolver el producto actualizado
    $sel = $db->prepare(
        "SELECT id, name, price, team, year, league, image_url AS imageUrl, category, sizes
         FROM productos WHERE id = :id"
    );
    $sel->execute([':id' => $id]);
    $producto = $sel->fetch(PDO::FETCH_ASSOC);
    $producto['sizes']  = json_decode($producto['sizes'], true) ?? [];
    $producto['price']  = (float) $producto['price'];
    $producto['year']   = (int) $producto['year'];
    $producto['id']     = (int) $producto['id'];

    echo json_encode(['mensaje' => 'Producto actualizado correctamente', 'producto' => $producto]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
