<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['error' => 'Método no permitido']); exit;
}

require_once '../config/database.php';
require_once '../middleware/admin.php';
require_once '../emails/templates.php';

$adminPayload = requireAdmin();

$body = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Validar datos ──────────────────────────────────────
$id    = isset($body['id'])    ? (int)$body['id']      : 0;
$stock = isset($body['stock']) ? (array)$body['stock']  : [];

if ($id <= 0 || empty($stock)) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos']);
    exit;
}

$db = (new Database())->getConnection();

try {
    // Obtener stock existente
    $stmt = $db->prepare("SELECT sizes FROM productos WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Producto no encontrado']);
        exit;
    }

    // Construir el nuevo JSON de sizes
    $sizesActuales = json_decode($row['sizes'] ?? '[]', true) ?: [];
    $sizesMap = [];
    foreach ($sizesActuales as $sz) {
        $sizesMap[$sz['size']] = $sz['stock'];
    }

    foreach ($stock as $size => $qty) {
        $sizesMap[$size] = max(0, (int)$qty);
    }

    $sizesNuevo = array_map(
        fn($size, $s) => ['size' => $size, 'stock' => $s],
        array_keys($sizesMap),
        array_values($sizesMap)
    );

    $stmt = $db->prepare("UPDATE productos SET sizes = ? WHERE id = ?");
    $stmt->execute([json_encode($sizesNuevo), $id]);

    // ── Obtener nombre del producto ─────────────────
    $nameStmt = $db->prepare("SELECT name FROM productos WHERE id = ?");
    $nameStmt->execute([$id]);
    $productName = $nameStmt->fetchColumn() ?? "Producto #{$id}";

    // ── Registrar movimientos de stock + alertas ────
    $threshold = isset($body['threshold']) ? (int)$body['threshold'] : 3;
    $adminId   = (int)($adminPayload['id'] ?? 0);
    foreach ($stock as $size => $qty) {
        $prevStock = (int)($sizesMap[$size] ?? 0);
        $newStk    = max(0, (int)$qty);
        if ($prevStock === $newStk) continue;

        $diff = $newStk - $prevStock;
        $type = $diff > 0 ? 'entrada' : 'ajuste';

        try {
            $db->prepare(
                "INSERT INTO stock_movements
                 (product_id, product_name, size, type, quantity, previous_stock, new_stock, reason, admin_id)
                 VALUES (?,?,?,?,?,?,?,'ajuste_manual',?)"
            )->execute([$id, $productName, $size, $type, abs($diff), $prevStock, $newStk, $adminId]);
        } catch (PDOException $e) { /* tabla puede no existir */ }

        // Alerta de stock bajo
        if ($newStk <= $threshold && $newStk >= 0) {
            try {
                $checkAlert = $db->prepare("SELECT id FROM stock_alerts WHERE product_id=? AND size=? AND ignored=0");
                $checkAlert->execute([$id, $size]);
                if (!$checkAlert->fetch()) {
                    $db->prepare(
                        "INSERT INTO stock_alerts (product_id, product_name, size, current_stock, threshold)
                         VALUES (?,?,?,?,?)"
                    )->execute([$id, $productName, $size, $newStk, $threshold]);
                }
            } catch (PDOException $e) { /* tabla puede no existir */ }
        }

        // Si se repuso stock, notificar suscriptores
        if ($diff > 0) {
            try {
                $subsStmt = $db->prepare(
                    "SELECT id, email FROM stock_notifications WHERE product_id=? AND size=? AND sent=0"
                );
                $subsStmt->execute([$id, $size]);
                $subs = $subsStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($subs as $sub) {
                    $ok = sendStockAvailableEmail($sub['email'], [
                        'productName' => $productName,
                        'size'        => $size,
                        'productId'   => $id,
                    ]);
                    if ($ok) {
                        $db->prepare("UPDATE stock_notifications SET sent=1, sent_at=NOW() WHERE id=?")
                           ->execute([$sub['id']]);
                    }
                }
            } catch (PDOException $e) { /* tabla puede no existir */ }
        }
    }

    echo json_encode(['ok' => true]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al actualizar stock']);
}
