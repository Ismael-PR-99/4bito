import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET     = 'test-secret-for-vitest-only';
  process.env.JWT_EXPIRES_IN = '3600';
});

// Dynamic import so env vars are set before module init
async function getJwt() {
  return import('../jwt');
}

describe('signToken / verifyToken', () => {
  const payload = { id: 1, nombre: 'Test', email: 't@t.com', rol: 'cliente' };

  it('signs and verifies a valid token', async () => {
    const { signToken, verifyToken } = await getJwt();
    const token  = signToken(payload);
    const result = verifyToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.id).toBe(1);
      expect(result.payload.email).toBe('t@t.com');
    }
  });

  it('returns invalid for a tampered token', async () => {
    const { signToken, verifyToken } = await getJwt();
    const token   = signToken(payload);
    const tampered = token.slice(0, -3) + 'xxx';
    const result   = verifyToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid');
  });

  it('returns invalid for garbage input', async () => {
    const { verifyToken } = await getJwt();
    const result = verifyToken('not.a.jwt');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid');
  });

  it('returns expired for an expired token', async () => {
    const jwt = await import('jsonwebtoken');
    const { verifyToken } = await getJwt();
    const expired = jwt.default.sign({ ...payload }, 'test-secret-for-vitest-only', { expiresIn: -1 });
    const result  = verifyToken(expired);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('expired');
  });
});
