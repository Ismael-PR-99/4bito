import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user!.id]
  );
  res.json({ success: true, data: rows });
});

router.post('/mark-read', requireAuth, async (req, res) => {
  const { id } = req.body ?? {};
  if (id) {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [parseInt(id), req.user!.id]);
  } else {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user!.id]);
  }
  res.json({ success: true });
});

router.post('/subscribe', requireAuth, async (req, res) => {
  const { endpoint, p256dh, auth } = req.body ?? {};
  if (!endpoint || !p256dh || !auth) { res.status(400).json({ error: 'endpoint, p256dh y auth requeridos' }); return; }
  await pool.query(
    'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
    [req.user!.id, endpoint, p256dh, auth]
  );
  res.json({ success: true });
});

export default router;
