<?php
require_once __DIR__ . '/../helpers/cors.php';
require_once __DIR__ . '/../config/database.php';

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

// ─── Knowledge base ─────────────────────────────────────────
$kb = [
    // Saludos
    'hola'           => ['response' => "¡Hola! 👋 Bienvenido a **4Bito**, tu tienda de camisetas retro.\n¿En qué puedo ayudarte?",     'qr' => ['Ver productos', 'Envíos', 'Devoluciones']],
    'buenas'         => ['response' => "¡Buenas! 😊 ¿Qué te trae por aquí hoy?",                                                       'qr' => ['Ver productos', 'Envíos', 'Mi pedido']],
    'buenos días'    => ['response' => "¡Buenos días! ☀️ ¿En qué te puedo ayudar?",                                                    'qr' => ['Ver productos', 'Ofertas', 'Contactar agente']],
    'buenas tardes'  => ['response' => "¡Buenas tardes! 🌤️ ¿Qué necesitas?",                                                          'qr' => ['Ver productos', 'Envíos', 'Devoluciones']],
    'buenas noches'  => ['response' => "¡Buenas noches! 🌙 Estoy aquí para ayudarte.",                                                  'qr' => ['Ver productos', 'Mi pedido', 'Contactar agente']],
    'hey'            => ['response' => "¡Hey! 👋 ¿Qué necesitas?",                                                                     'qr' => ['Ver productos', 'Envíos', 'Devoluciones']],
    'saludos'        => ['response' => "¡Saludos! 🤖 Soy el asistente de 4Bito. ¿En qué te ayudo?",                                   'qr' => ['Envíos', 'Devoluciones', 'Tallas']],

    // Envío nacional
    'envío'          => ['response' => "📦 **Envíos nacionales (España):**\n- Estándar (3–5 días): **3,99 €**\n- Express (24h): **7,99 €**\n- Gratis en pedidos superiores a **50 €**",  'qr' => ['Envío internacional', 'Seguimiento', 'Devoluciones']],
    'envio'          => ['response' => "📦 **Envíos nacionales (España):**\n- Estándar (3–5 días): **3,99 €**\n- Express (24h): **7,99 €**\n- Gratis en pedidos superiores a **50 €**",  'qr' => ['Envío internacional', 'Seguimiento', 'Devoluciones']],
    'shipping'       => ['response' => "📦 **Shipping (Spain):**\n- Standard (3–5 days): **€3.99**\n- Express (24h): **€7.99**\n- Free over **€50**",                                   'qr' => ['International', 'Tracking', 'Returns']],
    'gastos de envío'=> ['response' => "📦 El envío estándar cuesta **3,99 €**. Gratis a partir de **50 €** en pedidos nacionales.",                                                    'qr' => ['Envío express', 'Internacional']],
    'envío gratis'   => ['response' => "🎉 El envío es **gratuito** en pedidos nacionales superiores a **50 €**.",                                                                       'qr' => ['Ver productos', 'Envío express']],
    'cuánto tarda'   => ['response' => "⏱️ El envío estándar tarda **3–5 días laborables**. El express llega en **24 horas**.",                                                          'qr' => ['Seguimiento', 'Envío express']],
    'cuando llega'   => ['response' => "⏱️ El envío estándar tarda **3–5 días laborables**. Puedes hacer seguimiento con el localizador que recibes por email.",                        'qr' => ['Seguimiento', 'Envío express']],

    // Internacional
    'internacional'  => ['response' => "🌍 **Envíos internacionales:**\n- Europa: **9,99 €** (5–10 días)\n- Resto del mundo: **14,99 €** (10–20 días)",                                 'qr' => ['Seguimiento', 'Devoluciones', 'Envío nacional']],
    'europa'         => ['response' => "🇪🇺 Enviamos a toda Europa por **9,99 €** con llegada estimada en 5–10 días laborables.",                                                       'qr' => ['Internacional', 'Seguimiento']],
    'fuera de españa'=> ['response' => "🌍 Sí, enviamos a todo el mundo. Europa: **9,99 €** | Resto: **14,99 €**.",                                                                     'qr' => ['Internacional', 'Seguimiento']],

    // Seguimiento
    'seguimiento'    => ['response' => "🔍 **Seguimiento de pedido:**\nUna vez enviado recibirás un email con el número de seguimiento. También puedes consultarlo en tu área de cliente.",  'qr' => ['Mi pedido', 'Contactar agente']],
    'localizar'      => ['response' => "🔍 Recibirás el número de seguimiento por email al enviar tu pedido.",                                                                              'qr' => ['Mi pedido', 'Contactar agente']],
    'número de seguimiento' => ['response' => "🔍 El número de seguimiento se envía por email al procesar el envío.",                                                                    'qr' => ['Mi pedido', 'Contactar agente']],

    // Devoluciones
    'devolución'     => ['response' => "↩️ **Política de devoluciones:**\n- Plazo: **30 días** desde la recepción\n- El artículo debe estar **sin usar y con etiquetas**\n- Rellena el formulario en tu área de cliente\n- El reembolso se gestiona en 5–7 días",   'qr' => ['Cambio de talla', 'Contactar agente', 'Política completa']],
    'devolucion'     => ['response' => "↩️ **Política de devoluciones:**\n- Plazo: **30 días** desde la recepción\n- El artículo debe estar sin usar y con etiquetas",                    'qr' => ['Cambio de talla', 'Contactar agente']],
    'devolver'       => ['response' => "↩️ Tienes **30 días** para devolver tu pedido. Inicia el proceso desde tu área de cliente.",                                                       'qr' => ['Cambio de talla', 'Contactar agente']],
    'reembolso'      => ['response' => "💳 El reembolso se tramita en **5–7 días laborables** una vez recibida la devolución.",                                                           'qr' => ['Devoluciones', 'Contactar agente']],

    // Cambio de talla
    'cambio de talla'=> ['response' => "🔄 **Cambio de talla:**\nDispones de **30 días** para solicitar un cambio. Contacta con nosotros indicando tu pedido y la talla deseada. Si hay stock, te la enviamos gratis.",   'qr' => ['Tallas disponibles', 'Devoluciones', 'Contactar agente']],
    'cambiar talla'  => ['response' => "🔄 Puedes cambiar la talla en los primeros **30 días**. Escríbenos con el número de pedido y la talla que necesitas.",                                                              'qr' => ['Tallas disponibles', 'Contactar agente']],
    'talla incorrecta'=> ['response' => "🔄 Lamentamos el inconveniente. Escríbenos tu número de pedido y la talla correcta y lo gestionamos.",                                                                            'qr' => ['Contactar agente', 'Devoluciones']],

    // Tallas
    'talla'          => ['response' => "📏 **Guía de tallas:**\n- XS: pecho 82–87 cm\n- S: pecho 88–93 cm\n- M: pecho 94–99 cm\n- L: pecho 100–105 cm\n- XL: pecho 106–113 cm\n- XXL: pecho 114–121 cm\n\n¿Quieres que te ayude a elegir?",   'qr' => ['Cambio de talla', 'Stock', 'Ver productos']],
    'tallas'         => ['response' => "📏 Disponemos de tallas de la **XS a la XXL**. Cada producto tiene su tabla de medidas en la página de producto.",                                                                                         'qr' => ['Guía de tallas', 'Cambio de talla']],
    'qué talla'      => ['response' => "📏 Para elegir tu talla mide el contorno de pecho y consulta nuestra guía:\nXS:<88cm | S:88–93 | M:94–99 | L:100–105 | XL:106–113 | XXL:>113",                                                        'qr' => ['Cambio de talla', 'Ver productos']],

    // Stock
    'stock'          => ['response' => "📊 El stock se actualiza en tiempo real en nuestra web. Si un producto está **agotado** puedes activar el **aviso de reposición** en su página.",   'qr' => ['Ver productos', 'Contactar agente']],
    'agotado'        => ['response' => "😔 Si el artículo está agotado, puedes activar el **aviso de reposición** en la página del producto para ser el primero en enterarte.",             'qr' => ['Ver productos', 'Contactar agente']],
    'hay stock'      => ['response' => "📊 La disponibilidad se muestra en tiempo real en cada producto. Puedes consultarla directamente en la tienda.",                                     'qr' => ['Ver productos']],
    'reponer'        => ['response' => "🔔 Activa el **aviso de reposición** en la página del producto y te avisaremos por email.",                                                         'qr' => ['Ver productos', 'Contactar agente']],

    // Pago
    'pago'           => ['response' => "💳 **Métodos de pago aceptados:**\n- Tarjeta de crédito/débito (Visa, Mastercard)\n- PayPal\n- Bizum\n- Transferencia bancaria\n\nTodas las transacciones son seguras (SSL).", 'qr' => ['Envíos', 'Devoluciones']],
    'pagar'          => ['response' => "💳 Aceptamos **tarjeta, PayPal, Bizum y transferencia**. El pago es 100% seguro con cifrado SSL.",                                                                              'qr' => ['Envíos', 'Devoluciones']],
    'tarjeta'        => ['response' => "💳 Aceptamos **Visa, Mastercard y American Express**.",                                                                                                                         'qr' => ['PayPal', 'Bizum', 'Envíos']],
    'paypal'         => ['response' => "✅ Sí, aceptamos **PayPal** como método de pago.",                                                                                                                              'qr' => ['Otros métodos de pago', 'Envíos']],
    'bizum'          => ['response' => "✅ Sí, aceptamos **Bizum** como método de pago rápido.",                                                                                                                       'qr' => ['Otros métodos de pago', 'Envíos']],
    'seguro'         => ['response' => "🔒 Sí, todas las transacciones están protegidas con **cifrado SSL de 256 bits**.",                                                                                             'qr' => ['Métodos de pago', 'Envíos']],

    // Descuentos
    'descuento'      => ['response' => "🏷️ **Descuentos activos:**\n- Código **BIENVENIDO10**: 10% en tu primer pedido\n- Envío gratis en pedidos +50 €\n- Ofertas especiales en la sección *Vitrina*",  'qr' => ['Ver ofertas', 'Código promocional', 'Ver productos']],
    'descuentos'     => ['response' => "🏷️ ¡Tenemos descuentos! Usa **BIENVENIDO10** para un 10% en tu primer pedido. Y envío gratis a partir de 50 €.",                                                  'qr' => ['Ver ofertas', 'Ver productos']],
    'oferta'         => ['response' => "🔥 Consulta nuestra sección de ofertas en la **Vitrina** para ver todos los artículos con descuento.",                                                             'qr' => ['Ver Vitrina', 'Descuentos']],
    'cupón'          => ['response' => "🏷️ Ingresa tu código de cupón en el paso de pago del carrito.",                                                                                                  'qr' => ['Descuentos activos', 'Ver productos']],
    'código'         => ['response' => "🏷️ Puedes usar el código **BIENVENIDO10** para obtener un **10% de descuento** en tu primer pedido.",                                                            'qr' => ['Ver productos', 'Cómo usar el código']],

    // Productos
    'camiseta'       => ['response' => "👕 Tenemos camisetas retro de fútbol de las décadas 70s, 80s, 90s y 2000s. ¡Cada una es única!",  'qr' => ['Ver por década', 'Ver por equipo', 'Tallas']],
    'camisetas'      => ['response' => "👕 Nuestra colección incluye camisetas retro de los mejores equipos del mundo.",                    'qr' => ['Ver colección', 'Por década', 'Tallas']],
    'producto'       => ['response' => "🛒 Puedes explorar toda nuestra colección en la tienda. ¿Buscas algo en concreto?",               'qr' => ['Ver colección', 'Por equipo', 'Ofertas']],
    'productos'      => ['response' => "🛒 Tenemos una amplia colección de camisetas retro. ¿Qué temporada o equipo buscas?",             'qr' => ['Ver colección', 'Por década', 'Más vendidos']],
    'retro'          => ['response' => "⚽ Somos especialistas en camisetas retro de fútbol. Tenemos piezas de los 70s hasta los 2000s.", 'qr' => ['Ver colección', 'Por década', 'Más vendidos']],
    'precio'         => ['response' => "💰 Los precios varían según el artículo y la exclusividad. Consulta cada producto en la tienda.", 'qr' => ['Ver colección', 'Ofertas']],
    'colección'      => ['response' => "🏆 Nuestra colección está organizada por décadas y equipos. ¡Hay piezas únicas que no encontrarás en otro sitio!",  'qr' => ['Ver 70s', 'Ver 80s', 'Ver 90s']],

    // Cuenta
    'cuenta'         => ['response' => "👤 Desde tu **área de cliente** puedes:\n- Ver tus pedidos\n- Gestionar devoluciones\n- Cambiar datos personales\n- Activar avisos de stock",  'qr' => ['Mis pedidos', 'Cambiar contraseña', 'Contactar agente']],
    'registro'       => ['response' => "✅ Registrarse es gratis y te permite hacer seguimiento de pedidos, gestionar devoluciones y recibir ofertas exclusivas.",                        'qr' => ['Crear cuenta', 'Ver productos']],
    'contraseña'     => ['response' => "🔑 Puedes cambiar tu contraseña desde **Ajustes > Seguridad** en tu área de cliente, o usar *¿Olvidaste tu contraseña?* en el login.",         'qr' => ['Área de cliente', 'Contactar agente']],
    'olvidé'         => ['response' => "🔑 Usa el enlace **¿Olvidaste tu contraseña?** en la página de login para restablecerla por email.",                                            'qr' => ['Iniciar sesión', 'Contactar agente']],

    // Artículo dañado / incorrecto
    'dañado'         => ['response' => "😟 ¡Lo sentimos mucho! Si recibiste un artículo dañado, contáctanos con **fotos del producto y del embalaje** y lo solucionamos de inmediato.",  'qr' => ['Contactar agente', 'Devoluciones']],
    'roto'           => ['response' => "😟 Lamentamos mucho el inconveniente. Escríbenos con el número de pedido y fotos del artículo dañado.",                                           'qr' => ['Contactar agente', 'Devoluciones']],
    'incorrecto'     => ['response' => "😟 Si recibiste el artículo equivocado, contáctanos con el número de pedido y te enviamos el correcto lo antes posible.",                        'qr' => ['Contactar agente', 'Devoluciones']],
    'equivocado'     => ['response' => "😟 ¡Disculpa! Escríbenos con tu pedido y lo resolvemos rápidamente.",                                                                            'qr' => ['Contactar agente', 'Devoluciones']],

    // Despedida
    'gracias'        => ['response' => "😊 ¡A ti! Si necesitas más ayuda, aquí estaré. ¡Que disfrutes tu compra!",  'qr' => ['Ver productos', 'Seguimiento']],
    'adiós'          => ['response' => "👋 ¡Hasta pronto! Ha sido un placer ayudarte.",                              'qr' => ['Ver productos']],
    'adios'          => ['response' => "👋 ¡Hasta luego! Cualquier duda, ya sabes dónde encontrarnos.",              'qr' => ['Ver productos']],
    'hasta luego'    => ['response' => "👋 ¡Hasta pronto! Que tengas un buen día.",                                  'qr' => ['Ver productos']],
    'bye'            => ['response' => "👋 Bye! Come back anytime.",                                                 'qr' => ['Ver productos']],
    'perfecto'       => ['response' => "😊 ¡Genial! ¿Necesitas algo más?",                                          'qr' => ['Ver productos', 'Envíos', 'Devoluciones']],
    'ok'             => ['response' => "😊 ¡Perfecto! ¿Hay algo más en lo que pueda ayudarte?",                     'qr' => ['Ver productos', 'Envíos']],
];

$fallbackResponses = [
    "Hmm, no estoy seguro de entenderte bien. 🤔 ¿Puedes reformular tu pregunta?\nSi lo prefieres, puedo conectarte con un **agente humano** que te ayudará mejor.",
    "No tengo una respuesta exacta a eso. 🤖 Prueba con alguna de estas opciones o pide ayuda a un agente.",
    "Esa pregunta se me escapa un poco. 😅 ¿Quieres hablar con uno de nuestros agentes?",
];
$fallbackQr = ['Envíos', 'Devoluciones', 'Tallas', 'Contactar agente'];

// ─── Keyword scoring ────────────────────────────────────────
$msgLower = mb_strtolower($message, 'UTF-8');
$best      = null;
$bestScore = 0;

foreach ($kb as $keyword => $data) {
    $kl = mb_strtolower($keyword, 'UTF-8');
    if (mb_strpos($msgLower, $kl) !== false) {
        $score = mb_strlen($kl);
        if ($score > $bestScore) {
            $bestScore = $score;
            $best = $data;
        }
    }
}

$source = 'keyword';
if ($bestScore < 3 || $best === null) {
    $source   = 'fallback';
    $response = $fallbackResponses[array_rand($fallbackResponses)];
    $qr       = $fallbackQr;
} else {
    $response = $best['response'];
    $qr       = $best['qr'];
}

// ─── Save bot message to DB ──────────────────────────────────
try {
    $db   = new Database();
    $conn = $db->getConnection();

    $stmt = $conn->prepare(
        "INSERT INTO chat_messages (conversation_id, sender, message, created_at)
         VALUES (?, 'bot', ?, NOW())"
    );
    $stmt->execute([$conversationId, $response]);
    $messageId = (int)$conn->lastInsertId();

    // Update conversation updated_at
    $up = $conn->prepare("UPDATE chat_conversations SET updated_at=NOW() WHERE id=?");
    $up->execute([$conversationId]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    exit;
}

echo json_encode([
    'success'      => true,
    'response'     => $response,
    'quickReplies' => $qr,
    'source'       => $source,
    'messageId'    => $messageId,
]);
