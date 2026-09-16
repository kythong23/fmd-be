import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { forbidden, unauthorized } from '../errors.js';
import type { AuthUser, UserRole } from '../types/durian.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}

interface TokenPayload {
  sub: string;
  typ: 'access' | 'refresh';
  ver: number;
}

export function signAccessToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, typ: 'access', ver: tokenVersion } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

export function signRefreshToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ sub: userId, typ: 'refresh', ver: tokenVersion } satisfies TokenPayload, config.jwtSecret, {
    expiresIn: config.refreshExpiresIn,
  } as jwt.SignOptions);
}

export function verifyToken(token: string, expected: 'access' | 'refresh'): TokenPayload {
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    throw unauthorized('Token không hợp lệ hoặc đã hết hạn');
  }
  if (payload.typ !== expected) throw unauthorized('Sai loại token');
  return payload;
}

/** Nạp user từ DB mỗi request: đổi role/assigned_block có hiệu lực ngay, không đợi token hết hạn. */
export async function loadUser(userId: string, tokenVersion: number): Promise<AuthUser> {
  const { rows } = await query(
    'select id, email, full_name, role, farm_id, assigned_block, token_version from users where id = $1',
    [userId],
  );
  const row = rows[0];
  if (!row) throw unauthorized('Tài khoản không tồn tại');
  if (row.token_version !== tokenVersion) throw unauthorized('Phiên đăng nhập đã bị thu hồi');
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    farmId: row.farm_id,
    assignedBlock: row.assigned_block,
  };
}

/** D1: mọi endpoint nằm sau middleware này. Không có route đọc ẩn danh. */
export function requireAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) throw unauthorized();
      const payload = verifyToken(token, 'access');
      req.user = await loadUser(payload.sub, payload.ver);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/**
 * 06_BACKEND §3: worker chỉ được ghi cho cây thuộc assigned_block. viewer không ghi gì.
 * Gọi SAU khi đã lấy được cây (cần block của cây) — không tin farmId/block client gửi.
 */
export function assertCanWriteTree(user: AuthUser, tree: { farm_id: string; block: string | null }): void {
  if (user.farmId && tree.farm_id !== user.farmId) throw forbidden('Cây không thuộc vườn của bạn');
  if (user.role === 'manager') return;
  if (user.role === 'viewer') throw forbidden('Tài khoản chỉ có quyền xem');
  // worker
  if (!user.assignedBlock) throw forbidden('Tài khoản chưa được gán khu vực phụ trách');
  if (tree.block !== user.assignedBlock) throw forbidden(`Bạn chỉ được cập nhật cây thuộc lô ${user.assignedBlock}`);
}

/** Chặn đọc chéo vườn. */
export function assertSameFarm(user: AuthUser, farmId: string): void {
  if (user.farmId && user.farmId !== farmId) throw forbidden('Dữ liệu không thuộc vườn của bạn');
}
