#!/bin/bash
# Ubuntu serverga avtomatik o'rnatish.
# Ishlatish:  sudo bash deploy/setup.sh toy.uz
#   (domen bo'lmasa, server IP manzilini yozing:  sudo bash deploy/setup.sh 185.1.2.3)
set -e
DOMAIN=${1:?"Domen yoki IP kiriting. Masalan: sudo bash deploy/setup.sh toy.uz"}
APP=/var/www/tuy
cd "$APP"

echo ">>> 1/6 Kerakli dasturlar o'rnatilmoqda..."
apt-get update -y
apt-get install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx

echo ">>> 2/6 Python muhiti..."
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install -r requirements.txt

echo ">>> 3/6 Sozlamalar (.env)..."
if [ ! -f .env ]; then
  SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(50))')
  HTTPS=1
  if [[ "$DOMAIN" =~ ^[0-9.]+$ ]]; then HTTPS=0; fi
  cat > .env <<ENV
DJANGO_DEBUG=0
DJANGO_SECRET_KEY=$SECRET
DJANGO_ALLOWED_HOSTS=$DOMAIN,www.$DOMAIN
DJANGO_CSRF_TRUSTED=https://$DOMAIN,https://www.$DOMAIN,http://$DOMAIN
DJANGO_HTTPS=$HTTPS
ENV
fi
set -a; . ./.env; set +a

echo ">>> 4/6 Baza va fayllar..."
venv/bin/python manage.py migrate --noinput
venv/bin/python manage.py collectstatic --noinput
mkdir -p media
chown -R www-data:www-data "$APP"

echo ">>> 5/6 Gunicorn va Nginx..."
cp deploy/tuy.service /etc/systemd/system/tuy.service
sed "s/__DOMAIN__/$DOMAIN www.$DOMAIN/" deploy/nginx.conf > /etc/nginx/sites-available/tuy
ln -sf /etc/nginx/sites-available/tuy /etc/nginx/sites-enabled/tuy
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now tuy
systemctl restart tuy
systemctl reload nginx

echo ">>> 6/6 HTTPS (SSL sertifikat)..."
if [[ "$DOMAIN" =~ ^[0-9.]+$ ]]; then
  echo "IP manzil uchun SSL berilmaydi — sayt http://$DOMAIN da ishlaydi."
else
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || echo "!!! SSL olinmadi. Domen DNS'i shu serverga qaraganini tekshirib, keyin: sudo certbot --nginx -d $DOMAIN"
fi

echo ""
echo "TAYYOR! Sayt: https://$DOMAIN   Admin: https://$DOMAIN/admin/"
echo "Admin parolini albatta almashtiring:  cd $APP && sudo -u www-data venv/bin/python manage.py changepassword admin"
