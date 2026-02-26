<?php
/**
 * Middleware: verifica JWT y exige rol admin.
 * Uso: require_once('../middleware/admin.php'); $payload = requireAdmin();
 */

require_once __DIR__ . '/../helpers/jwt.php';

function requireAdmin(): array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(['error' => 'Token no proporcionado']);
        exit();
    }

    $token = substr($authHeader, 7);
    $payload = verificarJWT($token);

    if ($payload === false) {
        http_response_code(401);
        echo json_encode(['error' => 'Token inválido o expirado']);
        exit();
    }

    if (($payload['rol'] ?? '') !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Acceso denegado: se requiere rol admin']);
        exit();
    }

    return $payload;
}
?>
