# Deploy BE lên VPS bằng PM2 (không dùng Docker)

Luồng tổng quát:

```
push main ──► GitHub Actions: npm ci → typecheck → test → build → đóng gói release.tar.gz
                      │
                      └─ SSH ─► VPS: giải nén vào releases/<id> → npm ci --omit=dev
                                     → migrate → đổi symlink current → pm2 reload → /health
```

- Push lên `dev` hoặc mở PR vào `main`: workflow chỉ chạy CI (typecheck, test, build), không deploy.
- Push lên `main` (hoặc bấm **Run workflow**): chạy CI rồi deploy.
- Ảnh lưu trên Cloudinary qua biến `CLOUDINARY_URL` trong `.env` của VPS (xem [deploy-render.md](deploy-render.md) mục 4). Không đặt biến này thì ảnh ghi vào `shared/uploads` trên VPS.

Các file liên quan:

| File | Vai trò |
|---|---|
| [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) | Workflow CI/CD |
| [scripts/deploy/remote-deploy.sh](../scripts/deploy/remote-deploy.sh) | Chạy trên VPS: cài đặt, migrate, reload, health check, dọn bản cũ |
| [ecosystem.config.cjs](../ecosystem.config.cjs) | Cấu hình PM2 |

---

## 1. Chuẩn bị VPS (làm 1 lần)

Yêu cầu: Ubuntu 22.04/24.04, tối thiểu 1 vCPU và 1 GB RAM (2 GB càng tốt vì `npm ci` build `argon2`). Các lệnh bên dưới chạy với quyền `root` hoặc qua `sudo`.

### 1.1 Cập nhật hệ thống, tạo user `deploy`

```bash
apt update && apt upgrade -y
apt install -y curl git build-essential python3 nginx ufw

adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy        # tuỳ chọn, nếu muốn deploy dùng sudo
```

> `build-essential` và `python3` dùng để `npm ci` build `argon2` từ source khi không có prebuilt binary.

### 1.2 Tường lửa

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'         # 80 + 443
ufw enable
```

**Không** mở cổng 2304 ra ngoài. App chỉ nghe nội bộ, Nginx chuyển request vào.

### 1.3 Cài Node.js 22 (NodeSource, cài vào hệ thống)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # v22.x
```

> Không dùng `nvm` cho user deploy: SSH không tương tác (lúc GitHub Actions gọi vào) không nạp `~/.bashrc`, nên sẽ báo `node: command not found`. NodeSource cài vào `/usr/bin` nên lúc nào cũng có.

### 1.4 Cài PM2 và cho tự chạy khi VPS khởi động lại

```bash
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy   # chạy lệnh mà nó in ra (nếu có)
```

Bật xoay vòng log để log không đầy ổ đĩa:

```bash
sudo -u deploy pm2 install pm2-logrotate
sudo -u deploy pm2 set pm2-logrotate:max_size 20M
sudo -u deploy pm2 set pm2-logrotate:retain 7
```

### 1.5 Cài PostgreSQL 16

```bash
apt install -y postgresql
sudo -u postgres psql <<'SQL'
CREATE USER fdm WITH PASSWORD 'đổi-mật-khẩu-dài-ngẫu-nhiên';
CREATE DATABASE fdm OWNER fdm;
SQL
```

Postgres mặc định chỉ nghe `localhost`. Giữ nguyên như vậy.

> Có thể dùng Postgres managed (Neon, Supabase…) thay vì tự cài. Khi đó chỉ cần đổi `DATABASE_URL`.

### 1.6 Tạo thư mục app và file `.env`

```bash
mkdir -p /var/www/fdm-be/{releases,shared/uploads}
chown -R deploy:deploy /var/www/fdm-be
sudo -u deploy nano /var/www/fdm-be/shared/.env
```

Nội dung `.env` production (tham khảo `.env.example`):

```dotenv
NODE_ENV=production
DATABASE_URL=postgres://fdm:MẬT_KHẨU@localhost:5432/fdm
PORT=2304
JWT_SECRET=<chuỗi ngẫu nhiên ≥ 64 ký tự: openssl rand -hex 48>
JWT_EXPIRES_IN=7d
REFRESH_EXPIRES_IN=30d
PUBLIC_BASE_URL=https://app.example.com
PUBLIC_API_URL=https://api.example.com
UPLOAD_DIR=uploads

CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
CLOUDINARY_FOLDER=fdm

CORS_ORIGIN=https://app.example.com
TRUST_PROXY=1
ENABLE_DOCS=false
LOG_GET_BODY=false
LOG_RETENTION_DAYS=14
ENABLE_LOG_UI=true
```

```bash
chmod 600 /var/www/fdm-be/shared/.env
```

`TRUST_PROXY` là số proxy đứng trước app:
- `1` khi chỉ có Nginx.
- `2` khi bật proxy (đám mây cam) của Cloudflare DNS rồi mới tới Nginx.

Đặt sai thì rate-limit đăng nhập sẽ gộp mọi người dùng thành một IP.

### 1.7 Nginx reverse proxy

`/etc/nginx/sites-available/fdm-be`:

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 55m;   # upload tối đa 5 ảnh × 10 MB (routes/uploads.ts)

    location / {
        proxy_pass http://127.0.0.1:2304;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/fdm-be /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 1.8 HTTPS (Let's Encrypt)

Trỏ DNS `api.example.com` (bản ghi A) về IP của VPS, sau đó:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.example.com
```

Certbot tự sửa cấu hình Nginx và tự gia hạn chứng chỉ.

---

## 2. Tạo SSH key cho GitHub Actions

Chạy trên **máy cá nhân**:

```bash
ssh-keygen -t ed25519 -C "github-actions-fdm-be" -f ./fdm_deploy -N ""
```

Chép public key lên VPS:

```bash
ssh-copy-id -i ./fdm_deploy.pub deploy@<IP_VPS>
# hoặc dán nội dung fdm_deploy.pub vào /home/deploy/.ssh/authorized_keys
```

Lấy fingerprint của host để workflow kiểm tra, tránh bị tấn công MITM:

```bash
ssh-keyscan -p 22 <IP_VPS>
```

Thử đăng nhập: `ssh -i ./fdm_deploy deploy@<IP_VPS> "node -v && pm2 -v"`. Lệnh phải in ra cả 2 version.

## 3. Cấu hình GitHub repo

Vào **Settings → Environments → New environment** và đặt tên `production`. Có thể bật *Required reviewers* nếu muốn duyệt tay trước khi deploy.

Vào **Settings → Secrets and variables → Actions** và thêm vào environment `production`:

| Loại | Tên | Giá trị |
|---|---|---|
| Secret | `VPS_HOST` | IP hoặc domain của VPS |
| Secret | `VPS_USER` | `deploy` |
| Secret | `VPS_SSH_KEY` | Toàn bộ nội dung file `fdm_deploy` (private key) |
| Secret | `VPS_KNOWN_HOSTS` | Output của `ssh-keyscan` |
| Secret | `VPS_PORT` | *(tuỳ chọn)* cổng SSH nếu khác 22 |
| Variable | `APP_DIR` | *(tuỳ chọn)* mặc định `/var/www/fdm-be` |

Xong bước này thì xoá file `fdm_deploy` trên máy cá nhân, hoặc cất ở nơi an toàn.

Các biến `.env` của app **không** đưa vào GitHub. Chúng chỉ nằm trong `/var/www/fdm-be/shared/.env` trên VPS.

## 4. Deploy lần đầu

Push lên `main` (hoặc vào tab **Actions → CI / Deploy BE → Run workflow**). Theo dõi log trong tab Actions. Bước cuối phải in ra `✓ Deploy ... thành công`.

Kiểm tra trên VPS:

```bash
pm2 status
pm2 logs fdm-be
curl https://api.example.com/health        # {"success":true,"ok":true}
```

Seed dữ liệu mẫu (nếu cần, chỉ chạy 1 lần):

```bash
cd /var/www/fdm-be/current && node dist/seed/seed.js
```

---

## 5. Vận hành hằng ngày

| Việc | Lệnh (trên VPS, user `deploy`) |
|---|---|
| Trạng thái | `pm2 status` |
| Xem log | `pm2 logs fdm-be` |
| Restart | `pm2 reload fdm-be` |
| Sau khi sửa `.env` | `cd /var/www/fdm-be/current && pm2 reload ecosystem.config.cjs --update-env` |
| Theo dõi CPU/RAM | `pm2 monit` |
| Backup DB | `pg_dump -U fdm -h localhost fdm > backup-$(date +%F).sql` |

### Rollback về bản trước

Script giữ 5 release gần nhất:

```bash
ls -1t /var/www/fdm-be/releases/
ln -sfn /var/www/fdm-be/releases/<id-cũ> /var/www/fdm-be/current
cd /var/www/fdm-be/current && pm2 reload ecosystem.config.cjs --update-env
```

> Rollback chỉ đổi code, **không** đảo ngược migration. Migration mới nên viết theo kiểu tương thích ngược (chỉ thêm cột/bảng, không đổi tên hay xoá ngay) để bản cũ vẫn chạy được trên schema mới.

### Backup DB tự động (khuyên dùng)

`crontab -e` của user `deploy`:

```cron
0 2 * * * pg_dump -U fdm -h localhost fdm | gzip > /home/deploy/backups/fdm-$(date +\%F).sql.gz && find /home/deploy/backups -mtime +14 -delete
```

(Tạo `~/.pgpass` chứa `localhost:5432:fdm:fdm:MẬT_KHẨU` với quyền `chmod 600` để `pg_dump` không hỏi mật khẩu.)

---

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| `node: command not found` khi deploy | Node cài bằng nvm. Cài lại bằng NodeSource (mục 1.3) |
| `Host key verification failed` | `VPS_KNOWN_HOSTS` sai hoặc VPS đã cài lại. Chạy lại `ssh-keyscan` |
| `npm ci` lỗi khi build `argon2` | Thiếu `build-essential python3` (mục 1.1) hoặc RAM quá ít. Thêm swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| `Thiếu biến môi trường ...` | `shared/.env` thiếu biến |
| `Không kết nối được Cloudinary: ...` | Sai `CLOUDINARY_URL`: 401 = sai api_key/api_secret, 404 = sai cloud name |
| Migrate lỗi | Bản cũ vẫn chạy (symlink chưa đổi). Sửa migration rồi push lại |
| `/health` không phản hồi | Xem `pm2 logs fdm-be --lines 100`. Thường do sai `DATABASE_URL` hoặc `PORT` |
| 413 khi upload ảnh | Tăng `client_max_body_size` trong Nginx |
