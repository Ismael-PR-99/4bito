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

$db = (new Database())->getConnection();

// Verificar tabla
try {
    $db->query("SELECT 1 FROM pedidos LIMIT 1");
} catch (PDOException $e) {
    echo json_encode(['pedidos' => []]); exit;
}

$estado = $_GET['estado'] ?? null;
$where  = '';
$params = [];

if ($estado && in_array($estado, ['procesando', 'enviado', 'entregado', 'cancelado'], true)) {
    $where  = 'WHERE p.estado = ?';
    $params = [$estado];
}

$stmt = $db->prepare("
    SELECT p.id, p.nombre_cliente, p.email, p.telefono,
           p.direccion, p.ciudad, p.cp, p.pais,
           p.total, p.estado, p.fecha_creacion, p.paypal_transaction_id,
           p.productos_json
    FROM pedidos p
    $where
    ORDER BY p.fecha_creacion DESC
    LIMIT 200
");
$stmt->execute($params);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

$pedidos = array_map(function ($row) use ($db) {
    $productos = json_decode($row['productos_json'] ?? '[]', true) ?: [];

    // Historial de estados
    $hStmt = $db->prepare("SELECT estado, fecha FROM pedido_historial WHERE pedido_id = ? ORDER BY fecha ASC");
    $hStmt->execute([$row['id']]);
    $historial = $hStmt->fetchAll(PDO::FETCH_ASSOC);

    return [
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
        'productos'           => $productos,
        'historialEstados'    => $historial,
    ];
}, $rows);

echo json_encode(['pedidos' => $pedidos]);
