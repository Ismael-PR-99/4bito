<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$competition = preg_replace('/[^A-Z0-9]/', '', $_GET['competition'] ?? 'PL');
$dateFrom    = preg_replace('/[^0-9\-]/', '', $_GET['dateFrom'] ?? date('Y-m-d'));
$dateTo      = preg_replace('/[^0-9\-]/', '', $_GET['dateTo'] ?? date('Y-m-d'));

$apiKey = 'TU_API_KEY_AQUI';
$url    = "https://api.football-data.org/v4/competitions/{$competition}/matches?dateFrom={$dateFrom}&dateTo={$dateTo}";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_HTTPHEADER     => ["X-Auth-Token: {$apiKey}"],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    http_response_code(502);
    echo json_encode(['error' => 'Error al conectar con la API de fútbol']);
    exit;
}

http_response_code($httpCode);
echo $response;
