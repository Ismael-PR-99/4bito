<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../config/database.php';
require_once '../config/security.php';
require_once '../helpers/rate-limiter.php';
require_once '../middleware/admin.php';

// Rate limiting para evitar abuso (máx 10 llamadas por minuto por IP)
if (!rateLimitCheck('pieza_deactivate', 10, 60)) {
    rateLimitExceeded();
}

requireAdmin();

try {
    $db = (new Database())->getConnection();

    // Buscar piezas activas expiradas
    $stmt = $db->query("SELECT id, product_id FROM pieza_semana WHERE is_active = 1 AND valid_until < NOW()");
    $expiradas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($expiradas)) {
        echo json_encode(['success' => true, 'deactivated' => 0, 'message' => 'No hay piezas expiradas']);
        exit();
    }

    $db->beginTransaction();
    $count = 0;
    foreach ($expiradas as $p) {
        // Restaurar precio original
        $db->prepare("UPDATE productos SET discounted_price = NULL, discount_percent = 0 WHERE id = :id")
           ->execute([':id' => $p['product_id']]);
        // Desactivar pieza
        $db->prepare("UPDATE pieza_semana SET is_active = 0 WHERE id = :id")
           ->execute([':id' => $p['id']]);
        $count++;
    }
    $db->commit();

    echo json_encode(['success' => true, 'deactivated' => $count]);
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    handleServerError('Error al desactivar piezas', $e);
}
?>
