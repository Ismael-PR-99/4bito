import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { pool } from '../db';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const sendLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 30 });

// POST /api/chat/conversations
router.post('/conversations', optionalAuth, async (req, res) => {
  const { sessionId, subject = 'Consulta general' } = req.body ?? {};
  const userId   = req.user?.id ?? null;
  const userName = req.user?.nombre ?? 'Visitante';
  const sid      = sessionId || crypto.randomBytes(16).toString('hex');

  let existing;
  if (userId) {
    const { rows } = await pool.query(
      "SELECT id, session_id, status FROM chat_conversations WHERE user_id = $1 AND status != 'closed' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    existing = rows[0];
  } else {
    const { rows } = await pool.query(
      "SELECT id, session_id, status FROM chat_conversations WHERE session_id = $1 AND status != 'closed' ORDER BY created_at DESC LIMIT 1",
      [sid]
    );
    existing = rows[0];
  }

  if (existing) {
    res.json({ conversationId: parseInt(existing.id), sessionId: existing.session_id, status: existing.status, isNew: false });
    return;
  }

  const newSid = sid || crypto.randomBytes(16).toString('hex');
  const { rows } = await pool.query(
    "INSERT INTO chat_conversations (user_id, session_id, user_name, subject, status) VALUES ($1,$2,$3,$4,'active') RETURNING id",
    [userId, newSid, userName, subject]
  );
  res.json({ conversationId: parseInt(rows[0].id), sessionId: newSid, status: 'active', isNew: true });
});

// GET /api/chat/messages
router.get('/messages', async (req, res) => {
  const convId = parseInt(req.query.conversationId as string ?? '0');
  const after  = parseInt(req.query.after as string ?? '0');
  if (!convId) { res.status(400).json({ error: 'conversationId requerido' }); return; }

  const { rows } = await pool.query(
    'SELECT * FROM chat_messages WHERE conversation_id = $1 AND id > $2 ORDER BY created_at ASC',
    [convId, after]
  );
  res.json({ success: true, data: rows });
});

// POST /api/chat/messages
router.post('/messages', sendLimiter, optionalAuth, async (req, res) => {
  const { conversationId, message, sender = 'user' } = req.body ?? {};
  if (!conversationId || !message) { res.status(400).json({ error: 'conversationId y message requeridos' }); return; }
  if (!['user', 'admin'].includes(sender)) { res.status(400).json({ error: 'Sender inválido' }); return; }

  if (sender === 'admin' && req.user?.rol !== 'admin') {
    res.status(403).json({ error: 'Se requiere autenticación admin' }); return;
  }
  if (sender === 'user' && !req.user) {
    res.status(401).json({ error: 'Token requerido' }); return;
  }

  const { rows: convRows } = await pool.query('SELECT id, user_id FROM chat_conversations WHERE id = $1', [parseInt(conversationId)]);
  if (!convRows.length) { res.status(404).json({ error: 'Conversación no encontrada' }); return; }

  if (sender === 'user' && convRows[0].user_id && convRows[0].user_id !== req.user?.id) {
    res.status(403).json({ error: 'No tienes permisos para esta conversación' }); return;
  }

  const { rows } = await pool.query(
    'INSERT INTO chat_messages (conversation_id, sender, message) VALUES ($1,$2,$3) RETURNING id',
    [parseInt(conversationId), sender, String(message).trim().substring(0, 2000)]
  );
  await pool.query('UPDATE chat_conversations SET fecha_actualizacion = NOW() WHERE id = $1', [parseInt(conversationId)]);
  res.json({ success: true, messageId: parseInt(rows[0].id) });
});

// GET /api/chat/rooms (admin)
router.get('/rooms', requireAdmin, async (req, res) => {
  const status = req.query.status as string | undefined;
  const params: any[] = [];
  const where = status ? `WHERE status = $${params.push(status)}` : '';
  const { rows } = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.is_read = 0 AND m.sender = 'user') as unread_count
     FROM chat_conversations c ${where} ORDER BY c.fecha_actualizacion DESC`,
    params
  );
  res.json({ success: true, data: rows });
});

// POST /api/chat/resolve (admin)
router.post('/resolve', requireAdmin, async (req, res) => {
  const { conversationId } = req.body ?? {};
  if (!conversationId) { res.status(400).json({ error: 'conversationId requerido' }); return; }
  await pool.query("UPDATE chat_conversations SET status = 'resolved', resolved_at = NOW() WHERE id = $1", [parseInt(conversationId)]);
  res.json({ success: true });
});

// POST /api/chat/request-human
router.post('/request-human', requireAuth, async (req, res) => {
  const { conversationId } = req.body ?? {};
  if (!conversationId) { res.status(400).json({ error: 'conversationId requerido' }); return; }
  await pool.query("UPDATE chat_conversations SET status = 'waiting' WHERE id = $1 AND user_id = $2", [parseInt(conversationId), req.user!.id]);
  res.json({ success: true });
});

// POST /api/chat/bot-response
router.post('/bot-response', async (req, res) => {
  const { message = '' } = req.body ?? {};
  const msg = String(message).toLowerCase();

  let response = 'Hola 👋 ¿En qué puedo ayudarte? Puedes preguntarme sobre tallas, envíos, devoluciones o nuestros productos.';
  if (msg.includes('talla') || msg.includes('size')) {
    response = 'Nuestras camisetas van de XS a 3XL. Consulta la guía de tallas en cada producto para más detalle.';
  } else if (msg.includes('envío') || msg.includes('envio') || msg.includes('shipping')) {
    response = 'El envío es gratuito en pedidos superiores a 50€. El plazo de entrega es de 2-5 días hábiles.';
  } else if (msg.includes('devolu') || msg.includes('return')) {
    response = 'Tienes 30 días desde la entrega para solicitar una devolución desde tu perfil.';
  } else if (msg.includes('pago') || msg.includes('paypal')) {
    response = 'Aceptamos pagos seguros con PayPal.';
  } else if (msg.includes('hola') || msg.includes('hey') || msg.includes('buenas')) {
    response = '¡Hola! ¿En qué puedo ayudarte hoy?';
  }

  res.json({ success: true, data: { response } });
});

export default router;
