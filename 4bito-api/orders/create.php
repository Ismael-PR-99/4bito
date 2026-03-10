<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: http://localhost:4200');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

require_once '../config/database.php';
require_once '../helpers/jwt.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos inválidos']);
    exit;
}

// Campos requeridos
$required = ['nombre', 'email', 'telefono', 'direccion', 'ciudad', 'cp', 'pais', 'productos', 'total'];
foreach ($required as $field) {
    if (empty($input[$field]) && $input[$field] !== 0) {
        http_response_code(400);
        echo json_encode(['error' => "Campo obligatorio: {$field}"]);
        exit;
    }
}

// Validar email
if (!filter_var($input['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email inválido']);
    exit;
}

// Extraer user_id del JWT si está autenticado
$userId = null;
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
if (!empty($authHeader) && str_starts_with($authHeader, 'Bearer ')) {
    $token = substr($authHeader, 7);
    $payload = verificarJWT($token);
    if ($payload) {
        $userId = (int)($payload['id'] ?? $payload['sub'] ?? null);
    }
}

$nombre    = trim($input['nombre']);
$email     = trim($input['email']);
$telefono  = trim($input['telefono']);
$direccion = trim($input['direccion']);
$ciudad    = trim($input['ciudad']);
$cp        = trim($input['cp']);
$pais      = trim($input['pais']);
$total     = (float)$input['total'];
$productos = $input['productos']; // array de {id, nombre, imageUrl, talla, cantidad, precio}
$paypalTxn = trim($input['paypalTransactionId'] ?? '');

try {
    $db = (new Database())->getConnection();
    $db->beginTransaction();

    // 1. Insertar pedido
    $stmt = $db->prepare("
        INSERT INTO pedidos (user_id, nombre_cliente, email, telefono, direccion, ciudad, cp, pais, total, estado, paypal_transaction_id, productos_json, fecha_creacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'procesando', ?, ?, NOW())
    ");
    $stmt->execute([
        $userId,
        $nombre,
        $email,
        $telefono,
        $direccion,
        $ciudad,
        $cp,
        $pais,
        $total,
        $paypalTxn ?: null,
        json_encode($productos),
    ]);
    $pedidoId = (int)$db->lastInsertId();

    // 2. Insertar en historial de estados
    $stmt2 = $db->prepare("INSERT INTO pedido_historial (pedido_id, estado, fecha) VALUES (?, 'procesando', NOW())");
    $stmt2->execute([$pedidoId]);

    // 3. Descontar stock de cada producto/talla
    foreach ($productos as $prod) {
        $prodId   = (int)($prod['id'] ?? 0);
        $talla    = $prod['talla'] ?? '';
        $cantidad = (int)($prod['cantidad'] ?? 1);
        if ($prodId <= 0 || empty($talla)) continue;

        // Leer sizes JSON actual
        $stmtP = $db->prepare("SELECT sizes FROM productos WHERE id = ?");
        $stmtP->execute([$prodId]);
        $row = $stmtP->fetch(PDO::FETCH_ASSOC);
        if (!$row) continue;

        $sizes = json_decode($row['sizes'], true) ?: [];
        foreach ($sizes as &$s) {
            if ($s['size'] === $talla) {
                $s['stock'] = max(0, $s['stock'] - $cantidad);
            }
        }
        unset($s);

        $stmtU = $db->prepare("UPDATE productos SET sizes = ? WHERE id = ?");
        $stmtU->execute([json_encode($sizes), $prodId]);
    }

    $db->commit();

    // 4. Enviar email de confirmación al cliente
    sendOrderConfirmationEmail($email, $nombre, $pedidoId, $productos, $total);

    // 5. Enviar notificación al admin
    sendAdminNewOrderEmail($pedidoId, $nombre, $total);

    echo json_encode([
        'ok'       => true,
        'pedidoId' => $pedidoId,
        'mensaje'  => 'Pedido creado correctamente',
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Error al crear el pedido: ' . $e->getMessage()]);
}

// ─── Funciones de email ────────────────────────────────────────────

function sendOrderConfirmationEmail(string $to, string $nombre, int $pedidoId, array $productos, float $total): void {
    $productosHtml = '';
    foreach ($productos as $p) {
        $pNombre  = htmlspecialchars($p['nombre'] ?? '', ENT_QUOTES, 'UTF-8');
        $pTalla   = htmlspecialchars($p['talla'] ?? '', ENT_QUOTES, 'UTF-8');
        $pCant    = (int)($p['cantidad'] ?? 1);
        $pPrecio  = number_format((float)($p['precio'] ?? 0), 2, ',', '.');
        $productosHtml .= "<div class='info-row'><span class='info-label'>{$pNombre} (Talla {$pTalla}) x{$pCant}</span><span class='info-value'>{$pPrecio}€</span></div>";
    }
    $totalFmt  = number_format($total, 2, ',', '.');
    $trackUrl  = "http://localhost:4200/#/perfil";
    $nombreSafe = htmlspecialchars($nombre, ENT_QUOTES, 'UTF-8');

    $subject = "✅ Pedido #{$pedidoId} confirmado — 4BITO Retro Sports";
    $body = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { background:#0a0a0a; color:#e5e5e5; font-family:'Helvetica Neue',Arial,sans-serif; margin:0; padding:0; }
  .container { max-width:560px; margin:40px auto; background:#141414; border:1px solid #2a2a2a; border-radius:8px; overflow:hidden; }
  .header { background:#FF6B35; padding:28px 32px; }
  .header h1 { color:#fff; margin:0; font-size:20px; letter-spacing:2px; }
  .body { padding:32px; }
  .info-row { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #2a2a2a; }
  .info-label { color:#888; font-size:13px; }
  .info-value { color:#e5e5e5; font-size:13px; font-weight:600; }
  .total-row { display:flex; justify-content:space-between; padding:16px 0; margin-top:8px; }
  .total-label { color:#FF6B35; font-size:15px; font-weight:700; letter-spacing:1px; }
  .total-value { color:#FF6B35; font-size:18px; font-weight:700; }
  .btn { display:inline-block; margin-top:24px; padding:14px 28px; background:#FF6B35; color:#fff; text-decoration:none; border-radius:4px; font-size:13px; font-weight:700; letter-spacing:1px; }
  .footer { padding:20px 32px; border-top:1px solid #2a2a2a; color:#666; font-size:11px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>✅ PEDIDO CONFIRMADO</h1></div>
    <div class="body">
      <p style="margin-top:0">¡Hola <strong>{$nombreSafe}</strong>! Tu pedido ha sido recibido correctamente.</p>
      <div class="info-row"><span class="info-label">Nº PEDIDO</span><span class="info-value">#{$pedidoId}</span></div>
      {$productosHtml}
      <div class="total-row"><span class="total-label">TOTAL</span><span class="total-value">{$totalFmt}€</span></div>
      <p style="color:#888;font-size:13px;">Tu pedido está siendo procesado. Te enviaremos un email cuando sea enviado.</p>
      <a href="{$trackUrl}" class="btn">VER MIS PEDIDOS →</a>
    </div>
    <div class="footer">4BITO Retro Sports · Gracias por tu compra</div>
  </div>
</body>
</html>
HTML;

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: 4BITO Retro Sports <noreply@4bito.com>\r\n";

    @mail($to, $subject, $body, $headers);
}

function sendAdminNewOrderEmail(int $pedidoId, string $clienteNombre, float $total): void {
    $adminEmail   = 'admin@4bito.com';
    $totalFmt     = number_format($total, 2, ',', '.');
    $dashboardUrl = 'http://localhost:4200/#/admin/dashboard';
    $nombreSafe   = htmlspecialchars($clienteNombre, ENT_QUOTES, 'UTF-8');

    $subject = "🛒 Nuevo pedido #{$pedidoId} — {$totalFmt}€";
    $body = <<<HTML
<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body { background:#0a0a0a; color:#e5e5e5; font-family:'Helvetica Neue',Arial,sans-serif; margin:0; padding:0; }
  .container { max-width:560px; margin:40px auto; background:#141414; border:1px solid #2a2a2a; border-radius:8px; overflow:hidden; }
  .header { background:#22c55e; padding:28px 32px; }
  .header h1 { color:#fff; margin:0; font-size:20px; letter-spacing:2px; }
  .body { padding:32px; }
  .info-row { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #2a2a2a; }
  .info-label { color:#888; font-size:13px; }
  .info-value { color:#e5e5e5; font-size:13px; font-weight:600; }
  .btn { display:inline-block; margin-top:24px; padding:14px 28px; background:#22c55e; color:#fff; text-decoration:none; border-radius:4px; font-size:13px; font-weight:700; letter-spacing:1px; }
  .footer { padding:20px 32px; border-top:1px solid #2a2a2a; color:#666; font-size:11px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🛒 NUEVO PEDIDO RECIBIDO</h1></div>
    <div class="body">
      <div class="info-row"><span class="info-label">PEDIDO</span><span class="info-value">#{$pedidoId}</span></div>
      <div class="info-row"><span class="info-label">CLIENTE</span><span class="info-value">{$nombreSafe}</span></div>
      <div class="info-row"><span class="info-label">TOTAL</span><span class="info-value" style="color:#22c55e;font-size:16px;font-weight:700">{$totalFmt}€</span></div>
      <a href="{$dashboardUrl}" class="btn">VER EN DASHBOARD →</a>
    </div>
    <div class="footer">4BITO Retro Sports · Notificación automática de pedidos</div>
  </div>
</body>
</html>
HTML;

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: 4BITO Retro Sports <noreply@4bito.com>\r\n";

    @mail($adminEmail, $subject, $body, $headers);
}
