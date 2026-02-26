<?php
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function generarJWT($payload) {
    $secret = 'clave_secreta_4bito_2024';
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode($payload));
    $firma = base64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$firma";
}

function verificarJWT($token) {
    $secret = 'clave_secreta_4bito_2024';
    $partes = explode('.', $token);
    if (count($partes) !== 3) return false;
    [$header, $payload, $firma] = $partes;
    $firmaEsperada = base64url_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    if ($firma !== $firmaEsperada) return false;
    return json_decode(base64_decode($payload), true);
}
?>