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
    $db->query("SELECT 1 FROM pedidos LIMIT 1");
} catch (PDOException $e) {
    echo json_encode(['success' => true, 'data' => []]); exit;
}

try {
    $stmt = $db->prepare(
        "SELECT id, nombre_cliente, email, total, estado,
                fecha_creacion, paypal_transaction_id, productos_json,
                direccion, ciudad, cp, pais, telefono
         FROM pedidos
         WHERE user_id = ?
         ORDER BY fecha_creacion DESC
         LIMIT 50"
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id']    = (int)$r['id'];
        $r['total'] = (float)$r['total'];
        $r['productos_json'] = json_decode($r['productos_json'] ?? '[]', true);
    }

    echo json_encode(['success' => true, 'data' => $rows]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
