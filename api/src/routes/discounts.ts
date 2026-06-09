import { Router } from 'express';
import { validate, validateCodeSchema } from '../validate';

const router = Router();

const VALID_CODES: Record<string, number> = {
  RETRO10: 10,
  VIP20:   20,
};

// POST /api/discounts/validate
router.post('/validate', validate(validateCodeSchema), (req, res) => {
  const code = req.body.code.toUpperCase();
  const discount = VALID_CODES[code];
  if (!discount) {
    res.status(400).json({ success: false, error: 'Código inválido' }); return;
  }
  res.json({ success: true, data: { code, discount } });
});

export default router;
