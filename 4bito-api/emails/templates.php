<?php
/**
 * Helpers de email para 4bito.
 * Usa PHP mail() — en producción configurar SMTP con SendGrid/Mailgun.
 */

function sendAdminLowStockEmail(string $to, array $data): bool {
    $productName  = $data['productName']  ?? '';
    $size         = $data['size']         ?? '';
    $currentStock = $data['currentStock'] ?? 0;
    $threshold    = $data['threshold']    ?? 3;
    $dashboardUrl = 'http://localhost:4200/#/admin/dashboard';

    $subject = "⚠️ STOCK BAJO — {$productName} Talla {$size}";

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
  .badge { display:inline-block; background:rgba(255,107,53,0.15); color:#FF6B35; border:1px solid #FF6B35; border-radius:4px; padding:4px 10px; font-size:13px; font-weight:700; }
  .info-row { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid #2a2a2a; }
  .info-label { color:#888; font-size:13px; }
  .info-value { color:#e5e5e5; font-size:13px; font-weight:600; }
  .btn { display:inline-block; margin-top:24px; padding:14px 28px; background:#FF6B35; color:#fff; text-decoration:none; border-radius:4px; font-size:13px; font-weight:700; letter-spacing:1px; }
  .footer { padding:20px 32px; border-top:1px solid #2a2a2a; color:#666; font-size:11px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ ALERTA DE STOCK BAJO</h1>
    </div>
    <div class="body">
      <p style="margin-top:0">El siguiente producto tiene stock por debajo del umbral configurado:</p>
      <div class="info-row"><span class="info-label">PRODUCTO</span><span class="info-value">{$productName}</span></div>
      <div class="info-row"><span class="info-label">TALLA</span><span class="info-value">{$size}</span></div>
      <div class="info-row"><span class="info-label">STOCK ACTUAL</span><span class="badge">{$currentStock} ud.</span></div>
      <div class="info-row"><span class="info-label">UMBRAL MÍNIMO</span><span class="info-value">{$threshold} ud.</span></div>
      <a href="{$dashboardUrl}" class="btn">IR AL INVENTARIO →</a>
    </div>
    <div class="footer">4BITO Retro Sports · Sistema de alertas automáticas</div>
  </div>
</body>
</html>
HTML;

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: 4BITO Retro Sports <noreply@4bito.com>\r\n";

    return mail($to, $subject, $body, $headers);
}

function sendStockAvailableEmail(string $to, array $data): bool {
    $productName = $data['productName'] ?? '';
    $size        = $data['size']        ?? '';
    $productId   = $data['productId']   ?? '';
    $productUrl  = "http://localhost:4200/#/producto/{$productId}";

    $subject = "✅ ¡YA DISPONIBLE! {$productName} — Talla {$size}";

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
    <div class="header"><h1>✅ ¡PRODUCTO DISPONIBLE!</h1></div>
    <div class="body">
      <p style="margin-top:0">El producto que seguías ya está disponible:</p>
      <div class="info-row"><span class="info-label">PRODUCTO</span><span class="info-value">{$productName}</span></div>
      <div class="info-row"><span class="info-label">TALLA</span><span class="info-value">{$size}</span></div>
      <a href="{$productUrl}" class="btn">COMPRAR AHORA →</a>
    </div>
    <div class="footer">4BITO Retro Sports · Deja de recibir notificaciones desde tu perfil.</div>
  </div>
</body>
</html>
HTML;

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: 4BITO Retro Sports <noreply@4bito.com>\r\n";

    return mail($to, $subject, $body, $headers);
}
