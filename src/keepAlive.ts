import type { NextFunction, Request, Response } from 'express';

// Render free ngủ sau 15 phút không có request VÀO. Cơ chế chính là cron-job.org gọi /health mỗi
// 10 phút (docs/deploy-render.md). Đây là lớp dự phòng khi cron bị tắt/lỗi: server tự gọi URL public
// của chính nó (đi ra ngoài rồi vào lại qua proxy Render → tính là traffic) khi im lặng đủ lâu.
// /health không được query DB — nếu không Neon sẽ không bao giờ được nghỉ, tốn hết giờ compute free.

let lastRequestAt = Date.now();

// Bỏ qua /health: Render health check gọi nội bộ mỗi ~5s, không được Render tính là traffic chống ngủ,
// nhưng nếu đếm thì mốc luôn mới → không bao giờ tự ping → vẫn bị ngủ.
export function trackActivity(req: Request, _res: Response, next: NextFunction) {
  if (req.path !== '/health') lastRequestAt = Date.now();
  next();
}

export function startKeepAlive(url: string, idleMinutes: number) {
  const idleMs = idleMinutes * 60_000;
  const timer = setInterval(async () => {
    if (Date.now() - lastRequestAt < idleMs) return;
    // Tự đặt lại mốc (trackActivity bỏ qua /health) → 13 phút sau mới ping tiếp, kể cả khi ping lỗi.
    lastRequestAt = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) console.warn(`[keep-alive] ${url} → ${res.status}`);
    } catch (e) {
      console.warn(`[keep-alive] ${url} lỗi: ${(e as Error).message}`);
    }
  }, 30_000);
  timer.unref(); // không giữ process sống khi server.close()
  console.log(`[keep-alive] tự ping ${url} khi im lặng ≥ ${idleMinutes} phút`);
}
