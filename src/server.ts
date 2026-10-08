import { mkdirSync } from 'node:fs';
import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { startKeepAlive } from './keepAlive.js';
import { verifyStorage } from './routes/uploads.js';

mkdirSync(config.uploadDir, { recursive: true });
await verifyStorage();

const server = createApp().listen(config.port, () => {
  console.log(`API sẵn sàng tại http://localhost:${config.port}/api/v1`);
  if (config.keepAlive.idleMinutes > 0 && config.keepAlive.url) {
    startKeepAlive(config.keepAlive.url, config.keepAlive.idleMinutes);
  }
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
