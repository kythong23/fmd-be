// PM2: chạy trong thư mục release (cwd = /var/www/fdm-be/current), .env được symlink từ shared/.
// 1 instance: rate-limit (express-rate-limit) đang giữ bộ đếm trong RAM — nhiều instance là mỗi cái đếm riêng.
module.exports = {
  apps: [
    {
      name: 'fdm-be',
      script: 'dist/server.js',
      exec_mode: 'cluster', // cluster để `pm2 reload` thay process không rớt request
      instances: 1,
      node_args: '--enable-source-maps',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      kill_timeout: 10000, // chờ server.close() + pool.end() trong server.ts
      time: true,
    },
  ],
};
