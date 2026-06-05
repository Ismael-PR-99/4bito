<?php
// Central bootstrap — incluir en lugar de los headers repetidos en cada endpoint

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/security.php';
require_once __DIR__ . '/../helpers/jwt.php';
require_once __DIR__ . '/../helpers/rate-limiter.php';

// ── CORS + JSON headers ─────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ── HTTP method validation ──────────────────────────────────
function requireMethod(string ...$methods): void {
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        exit;
    }
}

// ── JSON response helpers ───────────────────────────────────
function jsonOk(mixed $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function jsonErr(string $msg, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

// ── JWT helpers ─────────────────────────────────────────────
function getAuthPayload(): ?array {
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? getallheaders()['Authorization']
        ?? getallheaders()['authorization']
        ?? '';
    if (!preg_match('/Bearer\s+(\S+)/i', $header, $m)) return null;
    $payload = verificarJWT(trim($m[1]));
    return $payload ?: null;
}

function requireUserAuth(): array {
    $payload = getAuthPayload();
    if (!$payload) jsonErr('Token requerido', 401);
    return $payload;
}

function requireAdminAuth(): array {
    $payload = getAuthPayload();
    if (!$payload) jsonErr('Token no proporcionado', 401);
    if (($payload['rol'] ?? '') !== 'admin') jsonErr('Acceso denegado: se requiere rol admin', 403);
    return $payload;
}
