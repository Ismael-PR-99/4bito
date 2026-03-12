<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
if (!preg_match('/Bearer\s(\S+)/', $authHeader, $m)) {
    http_response_code(401); echo json_encode(['error' => 'Token requerido']); exit;
}
$payload = verificarJWT($m[1]);
if (!$payload) { http_response_code(401); echo json_encode(['error' => 'Token inválido']); exit; }
$userId = $payload['id'];

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) { http_response_code(400); echo json_encode(['error' => 'Body requerido']); exit; }

$orderId    = intval($data['orderId'] ?? 0);
$products   = $data['products'] ?? [];
$reason     = trim($data['reason'] ?? '');
$description = trim($data['description'] ?? '');
$photos     = $data['photos'] ?? [];
$resolution = ($data['resolution'] ?? '') === 'exchange' ? 'exchange' : 'refund';

if (!$orderId || empty($products) || !$reason) {
    http_response_code(400);
    echo json_encode(['error' => 'orderId, products y reason son obligatorios']);
    exit;
}
if ($reason === 'Otro' && $description === '') {
    http_response_code(400);
    echo json_encode(['error' => 'La descripción es obligatoria cuando el motivo es "Otro"']);
    exit;
}

$db = (new Database())->getConnection();

// Verificar que el pedido pertenece al usuario y está entregado
$stmt = $db->prepare('SELECT id, user_id, estado, productos_json, fecha_creacion FROM pedidos WHERE id = ? AND user_id = ? AND estado = "entregado"');
$stmt->execute([$orderId, $userId]);
$pedido = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$pedido) {
    http_response_code(400);
    echo json_encode(['error' => 'Pedido no válido para devolución']);
    exit;
}

// Verificar que no pase de 30 días
$fechaPedido = new DateTime($pedido['created_at'] ?? $pedido['fecha_creacion'] ?? 'now');
$ahora = new DateTime();
$diff = $ahora->diff($fechaPedido)->days;
if ($diff > 30) {
    http_response_code(400);
    echo json_encode(['error' => 'Han pasado más de 30 días desde la entrega']);
    exit;
}

// Verificar que no haya ya una devolución activa para este pedido
$stmt = $db->prepare('SELECT id FROM returns_requests WHERE order_id = ? AND status NOT IN ("rejected")');
$stmt->execute([$orderId]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(['error' => 'Ya existe una solicitud de devolución para este pedido']);
    exit;
}

$caseNumber = 'RET-' . time();

$stmt = $db->prepare('INSERT INTO returns_requests (order_id, user_id, products_json, reason, description, photos_json, resolution, status, case_number) VALUES (?, ?, ?, ?, ?, ?, ?, "pending", ?)');
$stmt->execute([
    $orderId,
    $userId,
    json_encode($products),
    $reason,
    $description,
    json_encode($photos),
    $resolution,
    $caseNumber,
]);

$returnId = $db->lastInsertId();

echo json_encode([
    'success' => true,
    'data' => [
        'returnId' => intval($returnId),
        'caseNumber' => $caseNumber,
        'message' => 'Solicitud enviada. Te contactaremos en 24-48h.',
    ],
]);
