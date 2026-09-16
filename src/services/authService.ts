import argon2 from 'argon2';
import { query } from '../db/pool.js';
import { unauthorized } from '../errors.js';
import { loadUser, signAccessToken, signRefreshToken, verifyToken } from '../middleware/auth.js';
import type { AuthUser } from '../types/durian.js';

export const hashPassword = (plain: string) => argon2.hash(plain);

function issue(user: AuthUser, tokenVersion: number) {
  return {
    user,
    accessToken: signAccessToken(user.id, tokenVersion),
    refreshToken: signRefreshToken(user.id, tokenVersion),
  };
}

export async function login(email: string, password: string) {
  const { rows } = await query('select * from users where email = $1', [email.toLowerCase()]);
  const row = rows[0];
  // So sánh hash cả khi không có user để thời gian phản hồi không lộ email nào tồn tại.
  const hash = row?.password_hash ?? '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const ok = await argon2.verify(hash, password).catch(() => false);
  if (!row || !ok) throw unauthorized('Email hoặc mật khẩu không đúng');

  return issue(
    {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      farmId: row.farm_id,
      assignedBlock: row.assigned_block,
    },
    row.token_version,
  );
}

export async function refresh(refreshToken: string) {
  const payload = verifyToken(refreshToken, 'refresh');
  const user = await loadUser(payload.sub, payload.ver);
  return issue(user, payload.ver);
}

/** Thu hồi mọi phiên của user. ponytail: bump token_version thay vì bảng revoked-token riêng. */
export async function logout(userId: string) {
  await query('update users set token_version = token_version + 1 where id = $1', [userId]);
}
