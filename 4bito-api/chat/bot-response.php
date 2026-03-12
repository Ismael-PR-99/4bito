<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/jwt.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$conversationId = isset($input['conversationId']) ? (int)$input['conversationId'] : 0;
$message        = isset($input['message'])        ? trim($input['message'])        : '';

if (!$conversationId || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing conversationId or message']);
    exit;
}

// ── Verificar que la conversación pertenece al usuario ──
$dbCheck = (new Database())->getConnection();
$ownerStmt = $dbCheck->prepare('SELECT user_id, session_id FROM chat_conversations WHERE id = ?');
$ownerStmt->execute([$conversationId]);
$convOwner = $ownerStmt->fetch(PDO::FETCH_ASSOC);
if (!$convOwner) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Conversación no encontrada']);
    exit;
}

$headers = getallheaders();
$authHeaderVal = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$jwtPayload = null;
if (preg_match('/Bearer\s(\S+)/', $authHeaderVal, $matches)) {
    $jwtPayload = verificarJWT($matches[1]);
}

$sessionId = $input['sessionId'] ?? '';
if ($jwtPayload) {
    if ($convOwner['user_id'] && (int)$convOwner['user_id'] !== (int)$jwtPayload['id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'No tienes permisos para esta conversación']);
        exit;
    }
} else {
    if (!$sessionId || $convOwner['session_id'] !== $sessionId) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'No tienes permisos para esta conversación']);
        exit;
    }
}

// ══════════════════════════════════════
// BASE DE CONOCIMIENTO COMPLETA 4BITO
// ══════════════════════════════════════
$knowledge = [

  // SALUDOS
  [
    'keys'     => ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'ola', 'hi', 'saludos'],
    'response' => "👋 ¡Hola! Bienvenido a 4BITO Retro Sports. Soy tu asistente y puedo ayudarte con envíos, tallas, devoluciones, pagos y más. ¿En qué puedo ayudarte hoy?",
    'qr'       => ['¿Cómo es el envío?', '¿Qué tallas hay?', '¿Cómo devuelvo?', '¿Cómo pago?']
  ],

  // ENVÍO
  [
    'keys'     => ['envio', 'envío', 'entrega', 'shipping', 'llega', 'cuanto tarda', 'cuando llega', 'plazo', 'dias'],
    'response' => "🚚 Tenemos dos opciones de envío:\n\n• **Estándar**: 3-5 días laborables\n• **Express**: 24/48h con coste adicional\n\n¡El envío es COMPLETAMENTE GRATIS en pedidos superiores a 50€! 🎉",
    'qr'       => ['¿Envían internacionalmente?', '¿Cómo hago seguimiento?']
  ],

  // ENVÍO INTERNACIONAL
  [
    'keys'     => ['internacional', 'extranjero', 'europa', 'mundo', 'fuera de españa', 'otro pais', 'otro país'],
    'response' => "🌍 ¡Sí! Enviamos a toda Europa y a muchos países del mundo. El plazo internacional es de 5-10 días laborables. Los gastos de envío varían según el destino y se calculan automáticamente en el checkout.",
    'qr'       => ['¿Cuánto tarda el envío?', '¿Cómo hago seguimiento?']
  ],

  // SEGUIMIENTO DE PEDIDO
  [
    'keys'     => ['seguimiento', 'tracking', 'donde esta', 'dónde está', 'estado pedido', 'mi pedido', 'numero pedido', 'número pedido'],
    'response' => "📦 Puedes ver el estado de tu pedido en:\n\n1. Ve a tu **Perfil** (icono arriba derecha)\n2. Haz clic en **Mis Pedidos**\n3. Selecciona el pedido para ver el detalle\n\n¿Tienes el número de pedido? Dímelo y te ayudo.",
    'qr'       => ['¿Cuánto tarda el envío?', 'Quiero hablar con un agente']
  ],

  // DEVOLUCIÓN
  [
    'keys'     => ['devolucion', 'devolución', 'devolver', 'cambio', 'cambiar', 'reembolso', 'quiero devolver', 'no me gusta', 'no me vale'],
    'response' => "↩️ Las devoluciones son muy sencillas:\n\n• **Plazo**: 30 días desde la recepción\n• **Coste**: GRATIS, sin coste para ti\n• **Proceso**: Perfil → Mis Pedidos → Solicitar devolución\n• **Reembolso**: 3-5 días hábiles tras recibir el artículo",
    'qr'       => ['¿Puedo cambiar la talla?', '¿Qué pasa si está dañado?']
  ],

  // CAMBIO DE TALLA
  [
    'keys'     => ['cambiar talla', 'cambio talla', 'otra talla', 'talla incorrecta', 'talla mal', 'me queda mal'],
    'response' => "📏 Para cambiar la talla:\n\n1. Solicita la devolución del artículo actual\n2. Realiza un nuevo pedido con la talla correcta\n\nEl reembolso del primer pedido llega en 3-5 días. Si tienes dudas sobre tu talla antes de comprar, consulta nuestra guía de tallas en cada producto.",
    'qr'       => ['¿Cómo devuelvo?', '¿Cuál es mi talla?']
  ],

  // GUÍA DE TALLAS
  [
    'keys'     => ['talla', 'tallaje', 'medida', 'tamaño', 'size', 'que talla', 'qué talla', 'cual es mi talla', 'cuál es mi talla', 's m l xl'],
    'response' => "📐 Disponemos de tallas S, M, L y XL. Nuestras camisetas siguen **tallaje europeo estándar**:\n\n• S → pecho 86-91cm\n• M → pecho 91-96cm\n• L → pecho 96-101cm\n• XL → pecho 101-106cm\n\nSi estás entre dos tallas, recomendamos pedir la más grande para un ajuste cómodo.",
    'qr'       => ['¿Cómo devuelvo si no me vale?', '¿Hay stock de mi talla?']
  ],

  // STOCK
  [
    'keys'     => ['stock', 'disponible', 'agotado', 'queda', 'hay existencias', 'tienen', 'queda alguno'],
    'response' => "🏷️ El stock se actualiza en tiempo real en cada producto. Si una talla está **agotada** puedes activar el aviso \"Notificarme\" y te avisaremos por email cuando vuelva a estar disponible.",
    'qr'       => ['¿Cuándo llega nuevo stock?', 'Quiero ver los productos']
  ],

  // PAGO
  [
    'keys'     => ['pago', 'pagar', 'tarjeta', 'paypal', 'como pago', 'cómo pago', 'metodo', 'método', 'cobro', 'seguro pago'],
    'response' => "💳 Aceptamos los siguientes métodos de pago:\n\n• **Tarjeta**: Visa, Mastercard y Amex\n• **PayPal**: rápido y seguro\n\nTodos los pagos están protegidos con encriptación SSL. Nunca almacenamos datos de tarjeta.",
    'qr'       => ['¿Hay descuentos?', '¿Puedo pagar a plazos?']
  ],

  // DESCUENTOS Y OFERTAS
  [
    'keys'     => ['descuento', 'cupon', 'cupón', 'oferta', 'promocion', 'promoción', 'codigo', 'código', 'barato', 'rebaja', 'sale'],
    'response' => "🎟️ ¡Tenemos varias formas de ahorrar!\n\n• Descuentos automáticos de hasta **50%** en productos seleccionados\n• Envío gratis en pedidos +50€\n• Códigos de descuento: introdúcelos en el checkout\n\n¿Tienes un código? Aplícalo en el paso 2 del checkout.",
    'qr'       => ['¿Cómo uso el código?', '¿Hay más ofertas?']
  ],

  // PRODUCTOS / COLECCIÓN
  [
    'keys'     => ['productos', 'coleccion', 'colección', 'camiseta', 'camisetas', 'catalogo', 'catálogo', 'ver', 'busco', 'tienen'],
    'response' => "⚽ Nuestra colección incluye camisetas retro de las décadas:\n\n• 🕹️ **70s** — Clásicos históricos\n• 📼 **80s** — La era dorada\n• 💽 **90s** — Diseños icónicos\n• 📀 **2000s** — El fútbol moderno\n\nExplora toda la colección en el menú superior o usa los filtros.",
    'qr'       => ['¿Qué tallas hay?', '¿Hay descuentos?']
  ],

  // CUENTA / REGISTRO
  [
    'keys'     => ['cuenta', 'registro', 'registrar', 'crear cuenta', 'login', 'contraseña', 'olvidé', 'olvidé mi', 'acceder'],
    'response' => "👤 Para gestionar tu cuenta:\n\n• **Registrarse**: botón \"Admin/Usuario\" arriba a la derecha\n• **Recuperar contraseña**: en la pantalla de login → \"¿Olvidaste tu contraseña?\"\n• **Ver pedidos**: Perfil → Mis Pedidos\n\n¿Tienes algún problema concreto con tu cuenta?",
    'qr'       => ['No puedo acceder', 'Quiero hablar con un agente']
  ],

  // PRODUCTO DAÑADO O INCORRECTO
  [
    'keys'     => ['dañado', 'roto', 'mal estado', 'incorrecto', 'equivocado', 'no es el que pedi', 'no es lo que pedí', 'error en pedido'],
    'response' => "😟 ¡Lo sentimos mucho! Si has recibido un producto dañado o incorrecto:\n\n1. Ve a Perfil → Mis Pedidos → Solicitar devolución\n2. Selecciona el motivo: \"Producto dañado\" o \"Producto incorrecto\"\n3. Sube una foto del problema\n\nEn estos casos el envío de devolución y el reembolso son inmediatos con prioridad máxima.",
    'qr'       => ['Quiero hablar con un agente', '¿Cómo hago la devolución?']
  ],

  // DESPEDIDA
  [
    'keys'     => ['gracias', 'adios', 'adiós', 'hasta luego', 'ok gracias', 'perfecto gracias', 'genial', 'vale gracias', 'entendido'],
    'response' => "😊 ¡De nada! Ha sido un placer ayudarte. Si necesitas cualquier otra cosa estoy aquí 24/7. ¡Que disfrutes tu compra retro! ⚽🏆",
    'qr'       => []
  ],
];

// ══════════════════════════════════════
// MOTOR DE BÚSQUEDA DE KEYWORDS
// ══════════════════════════════════════
$msgLower  = mb_strtolower($message, 'UTF-8');
$bestMatch = null;
$bestScore = 0;

foreach ($knowledge as $item) {
  $score = 0;
  foreach ($item['keys'] as $key) {
    if (mb_strpos($msgLower, $key) !== false) {
      // Keyword más larga = más específica = mayor puntuación
      $score = max($score, mb_strlen($key));
    }
  }
  if ($score > $bestScore) {
    $bestScore = $score;
    $bestMatch = $item;
  }
}

// Respuesta fallback si no encuentra nada
$source = 'keyword';
if (!$bestMatch || $bestScore < 3) {
  $source    = 'fallback';
  $response  = "🤔 No he entendido bien tu consulta. Puedo ayudarte con envíos, tallas, devoluciones, pagos, pedidos y productos.\n\n¿Quieres que te conecte con un agente para una respuesta más personalizada?";
  $qr        = ['¿Cómo es el envío?', '¿Qué tallas hay?', '¿Cómo devuelvo?', 'Hablar con agente'];
} else {
  $response  = $bestMatch['response'];
  $qr        = $bestMatch['qr'];
}

// ─── Save bot message to DB ──────────────────────────────────
try {
    $db   = new Database();
    $conn = $db->getConnection();

    $stmt = $conn->prepare(
        "INSERT INTO chat_messages (conversation_id, sender, message) VALUES (?, 'bot', ?)"
    );
    $stmt->execute([$conversationId, $response]);
    $messageId = (int)$conn->lastInsertId();

    $up = $conn->prepare("UPDATE chat_conversations SET updated_at=NOW() WHERE id=?");
    $up->execute([$conversationId]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error interno del servidor']);
    exit;
}

echo json_encode([
    'success'      => true,
    'response'     => $response,
    'quickReplies' => $qr,
    'source'       => $source,
    'messageId'    => $messageId,
]);
