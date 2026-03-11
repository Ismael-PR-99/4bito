<?php
/**
 * JWT Helper — 4BITO Retro Sports
 * HMAC-SHA256 con secreto fuerte, expiración y comparación timing-safe.
 */

// ── Secreto JWT ────────────────────────────────────────────────────────────
// En producción: mover a variable de entorno ($_ENV['JWT_SECRET'])
define('JWT_SECRET', 'X9f#kL2$mP7vQ4wR8nA3jB6cY1dE5gH0iT9uO2sF4lN7xZ3bK8qW6eJ5hM1aU0p');
define('JWT_EXPIRATION_SECONDS', 86400); // 24 horas

function base64url_encode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
}

/**
 * Genera un JWT firmado con HMAC-SHA256.
 * Añade automáticamente iat (issued at) y exp (expiration).
 */
function generarJWT(array $payload): string {
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + JWT_EXPIRATION_SECONDS;

    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $body    = base64url_encode(json_encode($payload));
    $firma   = base64url_encode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));

    return "$header.$body.$firma";
}

/**
 * Verifica un JWT: comprueba firma (timing-safe) y expiración.
 * Devuelve el payload decodificado o false si es inválido/expirado.
 */
function verificarJWT(string $token): array|false {
    $partes = explode('.', $token);
    if (count($partes) !== 3) return false;

    [$header, $payload, $firma] = $partes;

    // Verificación timing-safe de la firma
    $firmaEsperada = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    if (!hash_equals($firmaEsperada, $firma)) {
        return false;
    }

    $data = json_decode(base64url_decode($payload), true);
    if (!is_array($data)) return false;

    // Verificar expiración
    if (isset($data['exp']) && $data['exp'] < time()) {
        return false;
    }

    return $data;
}
