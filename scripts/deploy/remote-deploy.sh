#!/usr/bin/env bash
# Chạy TRÊN VPS, do GitHub Actions gọi qua SSH: bash remote-deploy.sh <release-id>
# Cấu trúc:
#   $APP_DIR/releases/<id>/   mỗi lần deploy một thư mục
#   $APP_DIR/shared/.env      cấu hình thật (tạo tay 1 lần, không nằm trong git)
#   $APP_DIR/shared/uploads/  ảnh lưu local (chỉ dùng khi không bật R2)
#   $APP_DIR/current          symlink tới release đang chạy
set -euo pipefail

RELEASE_ID="${1:?thiếu release id}"
APP_DIR="${APP_DIR:-/var/www/fdm-be}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
DEST="$APP_DIR/releases/$RELEASE_ID"
TARBALL="$APP_DIR/releases/$RELEASE_ID.tar.gz"

[ -f "$APP_DIR/shared/.env" ] || { echo "✗ Chưa có $APP_DIR/shared/.env"; exit 1; }
mkdir -p "$APP_DIR/shared/uploads" "$DEST"

echo "→ Giải nén $RELEASE_ID"
tar -xzf "$TARBALL" -C "$DEST"
rm -f "$TARBALL"

cd "$DEST"
ln -sfn "$APP_DIR/shared/.env" .env
ln -sfn "$APP_DIR/shared/uploads" uploads

echo "→ Cài dependencies (argon2 build native trên chính VPS)"
npm ci --omit=dev --no-audit --no-fund

# Migrate TRƯỚC khi đổi symlink: lỗi thì dừng, bản cũ vẫn chạy nguyên.
echo "→ Migrate DB"
node dist/db/migrate.js

echo "→ Chuyển current → $RELEASE_ID"
ln -sfn "$DEST" "$APP_DIR/current"
cd "$APP_DIR/current"
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

echo "→ Health check"
PORT="$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '\r' || true)"
for i in $(seq 1 15); do
  if curl -fsS "http://127.0.0.1:${PORT:-2304}/health" >/dev/null; then
    echo "✓ Deploy $RELEASE_ID thành công"
    break
  fi
  [ "$i" = 15 ] && { echo "✗ /health không phản hồi"; pm2 logs fdm-be --lines 50 --nostream; exit 1; }
  sleep 2
done

# Giữ lại KEEP_RELEASES bản gần nhất để rollback.
ls -1dt "$APP_DIR"/releases/*/ | tail -n +"$((KEEP_RELEASES + 1))" | xargs -r rm -rf
