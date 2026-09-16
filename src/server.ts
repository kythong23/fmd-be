import { mkdirSync } from 'node:fs';
import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

mkdirSync(config.uploadDir, { recursive: true });

const server = createApp().listen(config.port, () => {
  console.log(`API sẵn sàng tại http://localhost:${config.port}/api/v1`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
