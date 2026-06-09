import { Router } from 'express';

const router = Router();

const VALID_CODES: Record<string, number> = {
  RETRO10: 10,
  VIP20:   20,
};

// POST /api/discounts/validate
router.post('/validate', (req, res) => {
  const code = String(req.body?.code ?? '').toUpperCase().trim();
  const discount = VALID_CODES[code];
  if (!discount) {
    res.status(400).json({ success: false, error: 'Código inválido' }); return;
  }
  res.json({ success: true, data: { code, discount } });
});

export default router;
