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

// ── Consultas ──────────────────────────────────────────
$db   = (new Database())->getConnection();
$hoy  = date('Y-m-d');
$ayer = date('Y-m-d', strtotime('-1 day'));

// Total productos
$stmt = $db->query("SELECT COUNT(*) as total FROM productos");
$totalProductos = (int)$stmt->fetchColumn();

// Comprobar si existe tabla pedidos
$tablaExists = false;
try {
    $db->query("SELECT 1 FROM pedidos LIMIT 1");
    $tablaExists = true;
} catch (PDOException $e) {}

$vendidosHoy = 0; $vendidosAyer = 0;
$ingresosHoy = 0.0; $ingresosAyer = 0.0;
$pedidosPendientes = 0; $pedidosPendientesAyer = 0;

if ($tablaExists) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM pedidos WHERE estado != 'cancelado' AND DATE(fecha_creacion) = ?");

    $stmt->execute([$hoy]);  $vendidosHoy  = (int)$stmt->fetchColumn();
    $stmt->execute([$ayer]); $vendidosAyer = (int)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE estado != 'cancelado' AND DATE(fecha_creacion) = ?");

    $stmt->execute([$hoy]);  $ingresosHoy  = (float)$stmt->fetchColumn();
    $stmt->execute([$ayer]); $ingresosAyer = (float)$stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM pedidos WHERE estado IN ('procesando','enviado') AND DATE(fecha_creacion) = ?");

    $stmt->execute([$hoy]);  $pedidosPendientes     = (int)$stmt->fetchColumn();
    $stmt->execute([$ayer]); $pedidosPendientesAyer = (int)$stmt->fetchColumn();
}

echo json_encode([
    'totalProductos'         => $totalProductos,
    'vendidosHoy'            => $vendidosHoy,
    'vendidosAyer'           => $vendidosAyer,
    'ingresosHoy'            => round($ingresosHoy, 2),
    'ingresosAyer'           => round($ingresosAyer, 2),
    'pedidosPendientes'      => $pedidosPendientes,
    'pedidosPendientesAyer'  => $pedidosPendientesAyer,
]);
