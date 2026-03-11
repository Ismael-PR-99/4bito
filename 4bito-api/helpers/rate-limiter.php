<?php
/**
 * Rate Limiter simple basado en archivos — 4BITO
 * Para entornos sin Redis. Usa archivos temporales por IP.
 */

/**
 * Verifica si una IP ha superado el límite de intentos.
 *
 * @param string $action   Identificador de la acción (ej: 'login', 'chat_send')
 * @param int    $maxAttempts Máximo de intentos permitidos
 * @param int    $windowSeconds Ventana de tiempo en segundos
 * @return bool  true si se permite la acción, false si se excedió el límite
 */
function rateLimitCheck(string $action, int $maxAttempts = 5, int $windowSeconds = 300): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $safeIp = preg_replace('/[^a-zA-Z0-9._\-]/', '_', $ip);
    $safeAction = preg_replace('/[^a-zA-Z0-9_]/', '_', $action);

    $dir = sys_get_temp_dir() . '/4bito_rate_limit/';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    $file = $dir . $safeAction . '_' . $safeIp . '.json';

    $data = ['attempts' => [], 'blocked_until' => 0];
    if (file_exists($file)) {
        $content = @file_get_contents($file);
        if ($content) {
            $parsed = json_decode($content, true);
            if (is_array($parsed)) {
                $data = $parsed;
            }
        }
    }

    $now = time();

    // Si está bloqueado, verificar si el bloqueo expiró
    if ($data['blocked_until'] > $now) {
        return false;
    }

    // Filtrar intentos dentro de la ventana
    $data['attempts'] = array_values(array_filter($data['attempts'], function ($t) use ($now, $windowSeconds) {
        return ($now - $t) < $windowSeconds;
    }));

    // Registrar nuevo intento
    $data['attempts'][] = $now;

    // ¿Excede el límite?
    if (count($data['attempts']) > $maxAttempts) {
        $data['blocked_until'] = $now + $windowSeconds;
        @file_put_contents($file, json_encode($data), LOCK_EX);
        return false;
    }

    @file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

/**
 * Responde con error 429 (Too Many Requests).
 */
function rateLimitExceeded(): void {
    http_response_code(429);
    echo json_encode([
        'error' => 'Demasiados intentos. Inténtalo de nuevo en unos minutos.'
    ]);
    exit;
}
