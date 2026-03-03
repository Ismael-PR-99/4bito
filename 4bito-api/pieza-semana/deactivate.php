<?php
header("Access-Control-Allow-Origin: http://localhost:4200");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once '../config/database.php';
// Este endpoint puede ser llamado desde el AppComponent (sin auth) para expiración automática,
// pero también desde admin. Verificamos si hay token; si no lo hay, es la llamada de expiración automática.
// Para seguridad extra: solo desactivamos piezas que ya vencieron (valid_until < NOW()).

try {
    $db = (new Database())->getConnection();

    // Buscar piezas activas expiradas
    $stmt = $db->query("SELECT id, product_id FROM pieza_semana WHERE is_active = 1 AND valid_until < NOW()");
    $expiradas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($expiradas)) {
        echo json_encode(['ok' => true, 'deactivated' => 0, 'message' => 'No hay piezas expiradas']);
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

    echo json_encode(['ok' => true, 'deactivated' => $count]);
} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
