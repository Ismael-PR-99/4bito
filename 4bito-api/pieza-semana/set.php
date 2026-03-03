<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../config/database.php';
require_once '../helpers/jwt.php';

// -- Leer token: primero del header Authorization, luego del body (fallback WAMP/CGI)
$rawBody = file_get_contents('php://input');
$body    = json_decode($rawBody, true) ?? [];

$authHeader = '';
if (function_exists('getallheaders')) {
    $allHeaders = getallheaders();
    $authHeader = $allHeaders['Authorization'] ?? $allHeaders['authorization'] ?? '';
}
// Fallback para Apache CGI donde getallheaders() no devuelve Authorization
if (empty($authHeader) && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
}
if (empty($authHeader) && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}
// Último fallback: token en el body JSON
if (empty($authHeader) && !empty($body['_token'])) {
    $authHeader = 'Bearer ' . $body['_token'];
}

if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
    http_response_code(401);
    echo json_encode(['error' => 'Token no proporcionado']);
    exit();
}

$token   = substr($authHeader, 7);
$payload = verificarJWT($token);

if ($payload === false) {
    http_response_code(401);
    echo json_encode(['error' => 'Token inválido o expirado']);
    exit();
}
if (($payload['rol'] ?? '') !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Acceso denegado: se requiere rol admin']);
    exit();
}

$productId       = isset($body['productId'])       ? (int)   $body['productId']       : 0;
$discountPercent = isset($body['discountPercent']) ? (float) $body['discountPercent'] : 0;
$finalPrice      = isset($body['finalPrice'])      ? (float) $body['finalPrice']      : 0;
$validUntil      = trim($body['validUntil'] ?? '');

if ($productId <= 0 || $discountPercent <= 0 || $discountPercent > 90 || $finalPrice <= 0 || empty($validUntil)) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos. productId, discountPercent (1-90), finalPrice y validUntil son obligatorios.']);
    exit();
}

try {
    $db = (new Database())->getConnection();
    $db->beginTransaction();

    // 1. Resetear descuento en TODOS los productos que tengan descuento activo
    $db->exec("UPDATE productos SET discounted_price = NULL, discount_percent = 0 WHERE discount_percent > 0");

    // 2. Eliminar todas las piezas anteriores (tabla limpia = solo existe una pieza siempre)
    $db->exec("DELETE FROM pieza_semana");

    // 3. Insertar la nueva pieza
    $stmt = $db->prepare("
        INSERT INTO pieza_semana (product_id, discount_percent, final_price, valid_until, is_active)
        VALUES (:pid, :dp, :fp, :vu, 1)
    ");
    $stmt->execute([
        ':pid' => $productId,
        ':dp'  => $discountPercent,
        ':fp'  => $finalPrice,
        ':vu'  => $validUntil,
    ]);
    $newId = $db->lastInsertId();

    // 4. Aplicar el descuento al nuevo producto
    $db->prepare("UPDATE productos SET discounted_price = :dp, discount_percent = :pct WHERE id = :id")
       ->execute([':dp' => $finalPrice, ':pct' => $discountPercent, ':id' => $productId]);

    $db->commit();
    echo json_encode(['ok' => true, 'piezaId' => (int) $newId]);

} catch (PDOException $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
