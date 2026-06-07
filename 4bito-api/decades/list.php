<?php
require_once '../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


try {
    $db = (new Database())->getConnection();

    $stmt = $db->prepare(
        "SELECT name FROM decades WHERE active = 1 ORDER BY name ASC"
    );
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $decades = array_map(fn($r) => $r['name'], $rows);

    echo json_encode(['success' => true, 'data' => $decades]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de base de datos']);
}
