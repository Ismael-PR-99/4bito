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

$tipo = $_GET['tipo'] ?? 'chart';
$db   = (new Database())->getConnection();

// Verificar tabla pedidos
$tablaExists = false;
try {
    $db->query("SELECT 1 FROM pedidos LIMIT 1");
    $tablaExists = true;
} catch (PDOException $e) {}

/* ── CHART: ingresos últimos 30 días ──────────────────── */
if ($tipo === 'chart') {
    $dias = [];
    for ($i = 29; $i >= 0; $i--) {
        $fecha = date('Y-m-d', strtotime("-{$i} days"));
        $dias[$fecha] = ['fecha' => $fecha, 'ingresos' => 0.0, 'pedidos' => 0];
    }

    if ($tablaExists) {
        $stmt = $db->prepare("
            SELECT DATE(fecha_creacion) as dia,
                   COALESCE(SUM(total), 0) as ingresos,
                   COUNT(*) as pedidos
            FROM pedidos
            WHERE estado = 'entregado'
              AND fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
            GROUP BY dia
        ");
        $stmt->execute();
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            if (isset($dias[$row['dia']])) {
                $dias[$row['dia']]['ingresos'] = (float)$row['ingresos'];
                $dias[$row['dia']]['pedidos']  = (int)$row['pedidos'];
            }
        }
    }

    echo json_encode(['dias' => array_values($dias)]);
    exit;
}

/* ── TOP: top 10 productos más vendidos (mes actual) ─── */
if ($tipo === 'top') {
    $topProductos = [];
    $resumen = ['ingresos' => 0.0, 'pedidosCompletados' => 0, 'ticketMedio' => 0.0, 'productoEstrella' => '—'];

    if ($tablaExists) {
        // Resumen del mes
        $stmt = $db->query("
            SELECT COALESCE(SUM(total),0) as ingresos, COUNT(*) as pedidos
            FROM pedidos
            WHERE estado = 'entregado'
              AND MONTH(fecha_creacion) = MONTH(CURDATE())
              AND YEAR(fecha_creacion)  = YEAR(CURDATE())
        ");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $resumen['ingresos']           = round((float)$row['ingresos'], 2);
        $resumen['pedidosCompletados'] = (int)$row['pedidos'];
        $resumen['ticketMedio']        = $resumen['pedidosCompletados'] > 0
            ? round($resumen['ingresos'] / $resumen['pedidosCompletados'], 2)
            : 0.0;

        // Top productos desde productos_json (requiere JSON_TABLE — MySQL 8+)
        // Fallback sencillo: leer todos los productos_json y procesar en PHP
        $topStmt = $db->query("SELECT productos_json FROM pedidos WHERE estado = 'entregado' AND productos_json IS NOT NULL");
        $conteo = [];
        foreach ($topStmt->fetchAll(PDO::FETCH_COLUMN) as $json) {
            $prods = json_decode($json, true) ?: [];
            foreach ($prods as $prod) {
                $pid = (int)($prod['id'] ?? 0);
                if (!$pid) continue;
                if (!isset($conteo[$pid])) {
                    $conteo[$pid] = [
                        'id'               => $pid,
                        'nombre'           => $prod['nombre']   ?? '',
                        'imageUrl'         => $prod['imageUrl'] ?? '',
                        'unidadesVendidas' => 0,
                        'ingresos'         => 0.0,
                    ];
                }
                $cant = (int)($prod['cantidad'] ?? 1);
                $conteo[$pid]['unidadesVendidas'] += $cant;
                $conteo[$pid]['ingresos'] += (float)($prod['precio'] ?? 0) * $cant;
            }
        }
        usort($conteo, fn($a, $b) => $b['unidadesVendidas'] <=> $a['unidadesVendidas']);
        $topProductos = array_slice(array_values($conteo), 0, 10);
        if (!empty($topProductos)) {
            $resumen['productoEstrella'] = $topProductos[0]['nombre'];
        }
    }

    echo json_encode(['productos' => $topProductos, 'resumen' => $resumen]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Tipo no válido']);
