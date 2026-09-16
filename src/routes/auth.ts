import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, refreshSchema } from '../schemas.js';
import * as authService from '../services/authService.js';

export const authRouter = Router();

// 06_BACKEND §5: chống brute-force.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

authRouter.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    res.json(await authService.login(email, password));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', loginLimiter, async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    res.json(await authService.refresh(refreshToken));
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth(), (req, res) => {
  res.json(req.user);
});

authRouter.post('/logout', requireAuth(), async (req, res, next) => {
  try {
    await authService.logout(req.user!.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
