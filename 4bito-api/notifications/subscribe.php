<?php
require_once '../config/bootstrap.php';
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }


$payload = requireUserAuth();

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['endpoint'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos de suscripción requeridos']);
    exit;
}

$db = (new Database())->getConnection();

// Eliminar suscripción anterior del usuario
$db->prepare('DELETE FROM push_subscriptions WHERE user_id = ?')->execute([$payload['id']]);

// Insertar nueva
$stmt = $db->prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key) VALUES (?, ?, ?, ?)');
$stmt->execute([
    $payload['id'],
    $data['endpoint'],
    $data['keys']['p256dh'] ?? '',
    $data['keys']['auth'] ?? '',
]);

echo json_encode(['success' => true]);
