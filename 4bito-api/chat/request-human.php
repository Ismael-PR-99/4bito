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
$hour         = (int)date('G');  // 0–23
$dayNames     = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
$today        = $dayNames[$dayOfWeek];
$nowTime      = date('H:i');
$inOfficeHours = ($dayOfWeek >= 1 && $dayOfWeek <= 5) && ($hour >= 9 && $hour < 18);

if ($inOfficeHours) {
    $estimatedWait = '5-10 minutos';
    $systemMsg     = "⏳ Tu solicitud ha sido registrada. Uno de nuestros agentes te atenderá en breve.\n\n📋 Horario de atención:\nLunes a Viernes · 9:00 - 18:00\n\nEn cuanto un agente esté disponible recibirás respuesta aquí mismo.";
} else {
    // Calcular próxima apertura
    if ($dayOfWeek >= 5) {
        $proximoDia = 'el lunes';
    } else {
        $proximoDia = 'mañana ' . $dayNames[$dayOfWeek + 1];
    }
    $estimatedWait = $proximoDia . ' a las 9:00';
    $systemMsg     = "🕐 Ahora mismo estamos fuera del horario de atención.\n\nHoy es $today y son las $nowTime h.\n\n📋 Horario de atención:\nLunes a Viernes · 9:00 - 18:00\n\nTu consulta ha quedado **registrada** y te responderemos $proximoDia a partir de las 9:00. Mientras tanto, el asistente automático está disponible 24/7. ⚽";
}

try {
    $db   = new Database();
    $conn = $db->getConnection();

    // Marcar conversación como waiting
    $stmt = $conn->prepare(
        "UPDATE chat_conversations SET status='waiting', updated_at=NOW() WHERE id=?"
    );
    $stmt->execute([$conversationId]);

    // Insertar mensaje de sistema como bot (compatible con ENUM actual)
    $ins = $conn->prepare(
        "INSERT INTO chat_messages (conversation_id, sender, sender_name, message, created_at)
         VALUES (?, 'bot', 'Sistema', ?, NOW())"
    );
    $ins->execute([$conversationId, $systemMsg]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error interno del servidor']);
    exit;
}

// Notificación para el admin (opcional, no bloquea)
try {
    $adminStmt = $conn->query("SELECT id FROM usuarios WHERE rol='admin' LIMIT 1");
    $admin = $adminStmt ? $adminStmt->fetch(PDO::FETCH_ASSOC) : null;
    if ($admin) {
        $notif = $conn->prepare(
            "INSERT INTO notifications (user_id, type, title, body, created_at)
             VALUES (?, 'chat_human_request', 'Nuevo chat pendiente', ?, NOW())"
        );
        $notif->execute([$admin['id'], "Cliente esperando atención humana en conversación #$conversationId"]);
    }
} catch (Exception $ignored) { /* notificación opcional */ }

echo json_encode([
    'success'       => true,
    'message'       => $systemMsg,
    'inOfficeHours' => $inOfficeHours,
    'estimatedWait' => $estimatedWait,
]);
