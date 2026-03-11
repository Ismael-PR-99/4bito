<?php
/**
 * Configuración de seguridad global — 4BITO
 * Incluir al inicio de cada endpoint para headers y manejo de errores seguro.
 */

// ── Suprimir errores PHP en producción ─────────────────────────────────────
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// ── Headers de seguridad ───────────────────────────────────────────────────
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

// ── Orígenes permitidos para CORS ──────────────────────────────────────────
define('ALLOWED_ORIGINS', [
    'http://localhost:4200',
]);

/**
 * Configura las cabeceras CORS de forma segura.
 * Reemplaza Access-Control-Allow-Origin: * por una lista blanca.
 */
function setupSecureCORS(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, ALLOWED_ORIGINS, true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        header('Access-Control-Allow-Origin: http://localhost:4200');
    }
    header('Access-Control-Allow-Credentials: true');
}

/**
 * Sanitiza una cadena de texto para prevenir XSS.
 */
function sanitizeInput(string $input, int $maxLength = 0): string {
    $cleaned = trim($input);
    $cleaned = htmlspecialchars($cleaned, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    if ($maxLength > 0) {
        $cleaned = mb_substr($cleaned, 0, $maxLength, 'UTF-8');
    }
    return $cleaned;
}

/**
 * Responde con error genérico de servidor sin exponer detalles de PDO.
 * Opcionalmente logea el error real.
 */
function handleServerError(string $genericMessage = 'Error interno del servidor', ?Throwable $e = null): void {
    if ($e) {
        error_log('[4BITO ERROR] ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    }
    http_response_code(500);
    echo json_encode(['error' => $genericMessage]);
    exit;
}
