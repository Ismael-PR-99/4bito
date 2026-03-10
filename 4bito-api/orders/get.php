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
require_once '../middleware/admin.php';

requireAdmin();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'ID requerido']); exit; }

$db = (new Database())->getConnection();

try {
    $stmt = $db->prepare("
        SELECT id, nombre_cliente, email, telefono,
               direccion, ciudad, cp, pais,
               total, estado, fecha_creacion, paypal_transaction_id, productos_json
        FROM pedidos WHERE id = ?
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(404); echo json_encode(['error' => 'Pedido no encontrado']); exit;
}

if (!$row) { http_response_code(404); echo json_encode(['error' => 'Pedido no encontrado']); exit; }

$hStmt = $db->prepare("SELECT estado, fecha FROM pedido_historial WHERE pedido_id = ? ORDER BY fecha ASC");
$hStmt->execute([$id]);
$historial = $hStmt->fetchAll(PDO::FETCH_ASSOC);

$pedido = [
    'id'                  => (int)$row['id'],
    'clienteNombre'       => $row['nombre_cliente'],
    'clienteEmail'        => $row['email'],
    'telefono'            => $row['telefono'],
    'direccion'           => $row['direccion'],
    'ciudad'              => $row['ciudad'],
    'cp'                  => $row['cp'],
    'pais'                => $row['pais'],
    'total'               => (float)$row['total'],
    'estado'              => $row['estado'],
    'fechaCreacion'       => $row['fecha_creacion'],
    'paypalTransactionId' => $row['paypal_transaction_id'],
    'productos'           => json_decode($row['productos_json'] ?? '[]', true) ?: [],
    'historialEstados'    => $historial,
];

echo json_encode(['pedido' => $pedido]);
