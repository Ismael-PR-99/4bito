<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input          = json_decode(file_get_contents('php://input'), true);
$conversationId = isset($input['conversationId']) ? (int)$input['conversationId'] : 0;

if (!$conversationId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing conversationId']);
    exit;
}

// ─── Office hours (Madrid / UTC+1, weekdays 9:00–18:00) ─────
date_default_timezone_set('Europe/Madrid');
$dayOfWeek    = (int)date('N');  // 1=Mon … 7=Sun
$hour         = (int)date('G');  // 0–23 (24h, no leading zero)
$inOfficeHours = ($dayOfWeek >= 1 && $dayOfWeek <= 5) && ($hour >= 9 && $hour < 18);

if ($inOfficeHours) {
    $estimatedWait = 'menos de 5 minutos';
    $systemMsg     = "🙋 Has solicitado hablar con un agente.\n⏳ Tiempo estimado de espera: **{$estimatedWait}**.\nUn agente se conectará contigo enseguida.";
} else {
    $nextOpen      = '';
    if ($dayOfWeek >= 6) {
        $daysUntilMon = 8 - $dayOfWeek;
        $nextOpen     = "el lunes a las 9:00";
    } elseif ($hour < 9) {
        $nextOpen = "hoy a las 9:00";
    } else {
        // after 18:00 on a weekday
        $tomorrowDay = $dayOfWeek + 1;
        if ($tomorrowDay <= 5) {
            $nextOpen = "mañana a las 9:00";
        } else {
            $nextOpen = "el próximo lunes a las 9:00";
        }
    }
    $estimatedWait = "apertura: {$nextOpen}";
    $systemMsg     = "🕐 Fuera de horario de atención.\n\n⌚ Nuestro horario es **lunes a viernes de 9:00 a 18:00**.\nTu solicitud ha quedado registrada. Un agente te responderá **{$nextOpen}**.\n\nMientras tanto puedo seguir ayudándote. 🤖";
}

try {
    $db   = new Database();
    $conn = $db->getConnection();

    // Update conversation status to 'waiting'
    $stmt = $conn->prepare(
        "UPDATE chat_conversations SET status='waiting', updated_at=NOW() WHERE id=?"
    );
    $stmt->execute([$conversationId]);

    // Insert system message
    $ins = $conn->prepare(
        "INSERT INTO chat_messages (conversation_id, sender, message, created_at)
         VALUES (?, 'system', ?, NOW())"
    );
    $ins->execute([$conversationId, $systemMsg]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

// Intentar notificar al admin (no bloquea si falla)
try {
    $notifData = json_encode([
        'conversationId' => $conversationId,
        'inOfficeHours'  => $inOfficeHours,
        'requestedAt'    => date('Y-m-d H:i:s'),
    ]);
    // Obtener el primer admin disponible
    $adminStmt = $conn->query("SELECT id FROM usuarios WHERE rol='admin' LIMIT 1");
    $admin = $adminStmt ? $adminStmt->fetch(PDO::FETCH_ASSOC) : null;
    if ($admin) {
        $notif = $conn->prepare(
            "INSERT INTO notifications (user_id, type, title, message, data, created_at)
             VALUES (?, 'chat_human_request', 'Nuevo chat pendiente', ?, ?, NOW())"
        );
        $notif->execute([$admin['id'], "Usuario solicita atención humana en conversación #{$conversationId}", $notifData]);
    }
} catch (Exception $ignored) { /* notificación opcional */ }

echo json_encode([
    'success'       => true,
    'message'       => $systemMsg,
    'inOfficeHours' => $inOfficeHours,
    'estimatedWait' => $estimatedWait,
]);
