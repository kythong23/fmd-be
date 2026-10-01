import type { NextFunction, Request, Response } from 'express';

// Render free ngủ sau 15 phút không có request VÀO. Server tự gọi URL public của chính nó
// (đi ra ngoài rồi vào lại qua proxy Render → tính là traffic), nhưng chỉ khi đã im lặng đủ lâu:
// có user dùng thì không ping thừa. Cron ngoài (cron-job.org) không làm được việc này vì
// muốn biết có traffic hay không thì phải gọi vào server — mà gọi vào đã là ping rồi.

let lastRequestAt = Date.now();

export function trackActivity(_req: Request, _res: Response, next: NextFunction) {
  lastRequestAt = Date.now();
  next();
}

export function startKeepAlive(url: string, idleMinutes: number) {
  const idleMs = idleMinutes * 60_000;
  const timer = setInterval(async () => {
    if (Date.now() - lastRequestAt < idleMs) return;
    try {
      // Request này đi vòng vào lại trackActivity → mốc được đặt lại, 13 phút sau mới ping tiếp.
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) console.warn(`[keep-alive] ${url} → ${res.status}`);
    } catch (e) {
      console.warn(`[keep-alive] ${url} lỗi: ${(e as Error).message}`);
    }
  }, 30_000);
  timer.unref(); // không giữ process sống khi server.close()
  console.log(`[keep-alive] tự ping ${url} khi im lặng ≥ ${idleMinutes} phút`);
}
