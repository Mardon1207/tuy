# Saytni serverga qo'yish yo'riqnomasi

Ikki yo'l bor. O'zingizga qulayini tanlang:

| | **A. O'z serveringiz (VPS)** | **B. PythonAnywhere (bepul)** |
|---|---|---|
| Narxi | oyiga ~3–6 $ | bepul |
| Manzil | o'z domeningiz: `toy.uz` | `ismingiz.pythonanywhere.com` |
| Qiyinligi | 1 ta buyruq (avtomatik) | brauzerda 10–15 daqiqa |
| Telegram bot | ishlaydi | ishlaydi |

Ikkala yo'lda ham `tuy_server.zip` faylidan foydalanasiz. Unda sayt, baza (sozlamalaringiz,
rasmlaringiz, tilaklar) va `media` papkasi bor.

---

## A. O'z serveringiz (Ubuntu VPS) — tavsiya etiladi

**Kerak bo'ladi:** Ubuntu 22.04 yoki 24.04 o'rnatilgan server (masalan, Ahost, Hetzner yoki DigitalOcean),
uning IP manzili va root paroli. Domen bo'lsa, uning **A yozuvini** server IP manziliga qarating
(buni domen sotib olgan saytdagi DNS bo'limida qilasiz).

### 1-qadam. Faylni serverga yuklash
Windows'da **WinSCP** dasturini oching → serverning IP manzili, `root` va parolni kiriting →
`tuy_server.zip` ni serverdagi `/var/www/` papkasiga sudrab tashlang.

### 2-qadam. Serverga kirib, o'rnatish
Windows'da **PowerShell** ni oching:
```
ssh root@SERVER_IP
```
Keyin serverda quyidagilarni ketma-ket yozing (`toy.uz` o'rniga o'z domeningiz yoki IP manzil):
```
apt-get install -y unzip
cd /var/www && unzip tuy_server.zip -d tuy
cd /var/www/tuy
sudo bash deploy/setup.sh toy.uz
```
Skript hamma ishni o'zi qiladi: dasturlarni o'rnatadi, saytni ishga tushiradi va HTTPS (qulf belgisi) qo'yadi.
Oxirida `TAYYOR!` yozuvi chiqadi.

### 3-qadam. Admin parolini almashtirish (majburiy!)
```
cd /var/www/tuy && sudo -u www-data bash -c 'set -a; . ./.env; venv/bin/python manage.py changepassword admin'
```
Hozirgi parol `admin12345` — hamma biladigan parol, uni albatta almashtiring.

### Tayyor
- Sayt: `https://toy.uz`
- Admin panel: `https://toy.uz/admin/` — bu yerda Telegram token va chat ID ni tekshiring, so'ng
  «Telegramga test xabar yuborish» tugmasini bosing.

### Keyinchalik saytni yangilash
Yangi `tuy_server.zip` ni yuklang va serverda bajaring (baza va rasmlar saqlanib qoladi):
```
cd /var/www && cp tuy/db.sqlite3 /root/db_zaxira.sqlite3
unzip -o tuy_server.zip -x 'db.sqlite3' 'media/*' -d tuy
cd tuy && sudo bash deploy/setup.sh toy.uz
```

### Muammo bo'lsa
- Sayt ochilmasa: `systemctl status tuy` va `journalctl -u tuy -n 50` — xatolik matnini menga yuboring.
- Rasm yuklab bo'lmasa: `chown -R www-data:www-data /var/www/tuy`

---

## B. PythonAnywhere (bepul)

1. https://www.pythonanywhere.com saytida bepul **Beginner** hisob oching.
2. **Files** bo'limi → **Upload a file** → `tuy_server.zip` ni yuklang.
3. **Consoles** → **Bash** ni oching va yozing:
   ```
   unzip tuy_server.zip -d tuy
   cd tuy
   python3.11 -m venv venv
   venv/bin/pip install -r requirements.txt
   venv/bin/python manage.py migrate
   venv/bin/python manage.py collectstatic --noinput
   venv/bin/python manage.py changepassword admin
   ```
4. **Web** bo'limi → **Add a new web app** → **Manual configuration** → **Python 3.11**.
5. Shu sahifada:
   - **Source code:** `/home/ISMINGIZ/tuy`
   - **Virtualenv:** `/home/ISMINGIZ/tuy/venv`
   - **Static files:** URL `/static/` → Directory `/home/ISMINGIZ/tuy/staticfiles`
   - **Static files:** URL `/media/` → Directory `/home/ISMINGIZ/tuy/media`
6. **WSGI configuration file** havolasini bosing, ichidagi hamma narsani o'chirib, shuni yozing
   (`ISMINGIZ` o'rniga PythonAnywhere'dagi ismingiz):
   ```python
   import os, sys
   path = '/home/ISMINGIZ/tuy'
   if path not in sys.path:
       sys.path.insert(0, path)
   os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings'
   os.environ['DJANGO_DEBUG'] = '0'
   os.environ['DJANGO_SECRET_KEY'] = 'bu-yerga-uzun-tasodifiy-matn-yozing-123abc'
   os.environ['DJANGO_ALLOWED_HOSTS'] = 'ISMINGIZ.pythonanywhere.com'
   os.environ['DJANGO_CSRF_TRUSTED'] = 'https://ISMINGIZ.pythonanywhere.com'
   from django.core.wsgi import get_wsgi_application
   application = get_wsgi_application()
   ```
7. **Save** → **Web** bo'limida yashil **Reload** tugmasini bosing.
8. Sayt: `https://ISMINGIZ.pythonanywhere.com`

> Eslatma: bepul hisobni har 3 oyda bir marta saytga kirib **"Run until 3 months from today"**
> tugmasini bosib uzaytirib turish kerak.

---

## Qisqa eslatmalar
- Telegram token va chat ID baza ichida saqlangan, shuning uchun serverda ham o'sha sozlamalar turadi.
- Sayt tilaklarni **SQLite** bazada saqlaydi. Bitta to'y uchun bu yetarli.
- Zaxira nusxa olish uchun serverdagi `db.sqlite3` fayli va `media` papkasini vaqti-vaqti bilan yuklab oling.
