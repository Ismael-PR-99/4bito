import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   ?? 'localhost',
  port:   parseInt(process.env.SMTP_PORT ?? '25'),
  secure: process.env.SMTP_SECURE === 'true',
  ...(process.env.SMTP_USER ? {
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' },
  } : {}),
});

const FROM    = process.env.SMTP_FROM    ?? 'noreply@4bito.com';
const ADMIN   = process.env.ADMIN_EMAIL  ?? 'admin@4bito.com';
const BASE_URL = process.env.FRONTEND_URL ?? 'http://localhost:4200';

async function send(to: string | string[], subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (e) {
    console.error('[email] send error:', e);
  }
}

// ── Order confirmation ────────────────────────────────────────────────────────

export interface OrderEmailData {
  pedidoId: number;
  email: string;
  nombre: string;
  productos: { nombre: string; talla: string; cantidad: number; precio: number }[];
  total: number;
  direccion: string;
  ciudad: string;
  cp: string;
  pais: string;
}

export async function sendOrderConfirmation(order: OrderEmailData): Promise<void> {
  const rows = order.productos.map(p =>
    `<tr>
       <td style="padding:6px 8px;border-bottom:1px solid #eee">${p.nombre} — ${p.talla}</td>
       <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${p.cantidad}</td>
       <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${(p.precio * p.cantidad).toFixed(2)} €</td>
     </tr>`
  ).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
      <h2 style="background:#111;color:#fff;padding:16px 24px;margin:0">4BITO — Pedido confirmado</h2>
      <div style="padding:24px">
        <p>Hola <strong>${order.nombre}</strong>,</p>
        <p>Tu pedido <strong>#${order.pedidoId}</strong> ha sido recibido y está siendo procesado.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;text-align:left">Producto</th>
              <th style="padding:8px;text-align:center">Uds.</th>
              <th style="padding:8px;text-align:right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:8px;text-align:right"><strong>Total</strong></td>
              <td style="padding:8px;text-align:right"><strong>${order.total.toFixed(2)} €</strong></td>
            </tr>
          </tfoot>
        </table>
        <p><strong>Dirección de envío:</strong><br>
          ${order.direccion}, ${order.cp} ${order.ciudad}, ${order.pais}
        </p>
        <p style="margin-top:24px">
          <a href="${BASE_URL}/#/perfil" style="background:#111;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">Ver mis pedidos</a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px">4BITO Retro Sports · ${new Date().getFullYear()}</p>
      </div>
    </div>`;

  await send(order.email, `Pedido #${order.pedidoId} confirmado — 4BITO`, html);
}

// ── Admin: new order alert ────────────────────────────────────────────────────

export async function sendNewOrderAlert(order: Pick<OrderEmailData, 'pedidoId' | 'nombre' | 'email' | 'total'>): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;color:#222">
      <h3>Nuevo pedido #${order.pedidoId}</h3>
      <p><strong>Cliente:</strong> ${order.nombre} (${order.email})</p>
      <p><strong>Total:</strong> ${order.total.toFixed(2)} €</p>
      <p><a href="${BASE_URL}/#/admin/pedidos/${order.pedidoId}">Ver pedido en el panel</a></p>
    </div>`;

  await send(ADMIN, `Nuevo pedido #${order.pedidoId} — ${order.total.toFixed(2)} €`, html);
}

// ── Stock notification ────────────────────────────────────────────────────────

export async function sendStockNotifications(
  emails: string[],
  productName: string,
  size: string,
  productId: number,
): Promise<void> {
  if (!emails.length) return;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
      <h2 style="background:#111;color:#fff;padding:16px 24px;margin:0">4BITO — ¡Ya hay stock!</h2>
      <div style="padding:24px">
        <p>Buenas noticias — el producto que esperabas ya está disponible:</p>
        <p style="font-size:18px"><strong>${productName}</strong> — Talla <strong>${size}</strong></p>
        <p style="margin-top:24px">
          <a href="${BASE_URL}/#/producto/${productId}" style="background:#111;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">Ver producto</a>
        </p>
        <p style="color:#888;font-size:12px;margin-top:32px">4BITO Retro Sports · Si no quieres recibir estas alertas, ignora este mensaje.</p>
      </div>
    </div>`;

  // Send to each subscriber individually to avoid exposing other emails
  await Promise.all(
    emails.map(email => send(email, `¡${productName} talla ${size} disponible! — 4BITO`, html))
  );
}
