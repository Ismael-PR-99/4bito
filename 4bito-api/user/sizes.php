<?php
require_once '../config/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }


$payload = requireUserAuth();
$userId  = (int)$payload['id'];

$database = new Database();
$db = $database->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare("SELECT id, user_id, size_camisetas, size_chaquetas, size_pantalones FROM user_sizes WHERE user_id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        echo json_encode(['success' => true, 'data' => ['sizes' => ['camisetas' => null, 'chaquetas' => null, 'pantalones' => null]]]);
    } else {
        echo json_encode(['success' => true, 'data' => ['sizes' => [
            'camisetas'  => $row['size_camisetas'],
            'chaquetas'  => $row['size_chaquetas'],
            'pantalones' => $row['size_pantalones'],
        ]]]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $camisetas  = trim($body['camisetas']  ?? '') ?: null;
    $chaquetas  = trim($body['chaquetas']  ?? '') ?: null;
    $pantalones = trim($body['pantalones'] ?? '') ?: null;

    $validSizes = ['XS','S','M','L','XL','XXL', null];
    if (!in_array($camisetas, $validSizes) || !in_array($chaquetas, $validSizes) || !in_array($pantalones, $validSizes)) {
        http_response_code(400); echo json_encode(['error' => 'Talla no válida']); exit;
    }

    try {
        $db->prepare(
            "INSERT INTO user_sizes (user_id, size_camisetas, size_chaquetas, size_pantalones)
             VALUES (?,?,?,?)
             ON CONFLICT (user_id) DO UPDATE SET
             size_camisetas  = EXCLUDED.size_camisetas,
             size_chaquetas  = EXCLUDED.size_chaquetas,
             size_pantalones = EXCLUDED.size_pantalones"
        )->execute([$userId, $camisetas, $chaquetas, $pantalones]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500); echo json_encode(['error' => 'Error interno del servidor']);
    }
    exit;
}

http_response_code(405); echo json_encode(['error' => 'Método no permitido']);
