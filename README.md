# 3D To'y taklifnomasi (Django)

## Ishga tushirish
```
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
- Sayt: http://127.0.0.1:8000/
- Admin panel: http://127.0.0.1:8000/admin/  (login: `admin`, parol: `admin12345` — albatta o'zgartiring!)

## Admin paneldan nimalarni sozlash mumkin
- **Sozlamalar**: kuyov/kelin ismi, sana, vaqt, manzil, Yandex/Google havolalar, karta raqami,
  **Telegram bot tokeni va chat ID**, fon musiqasi (mp3), ixtiyoriy 3D qahramon (.glb).
  Saqlagandan keyin yuqoridagi **«Telegramga test xabar yuborish»** tugmasini bosing.
- **Devordagi rasmlar**: 8 tagacha rasm (tartib raqami bilan).
- **Tilaklar**: mehmonlar yozgan tabriklar, Telegramga yuborilganmi-yo'qmi ko'rinadi, qayta yuborish mumkin.

## Boshqaruv
- Telefon: o'ngdagi doira — yurish, ekranni surish — aylantirish, ikki barmoq — yaqinlashtirish.
- Kompyuter: W/A/S/D yoki strelkalar, Shift — yugurish, sichqoncha bilan surish, g'ildirak — zoom.
- «Sayohat» — qahramon o'zi hamma joyni aylanib chiqadi.

## 3D modellar
- Mehmon (qahramon): «Business Man» — Quaternius, CC0 litsenziya (bepul, cheklovsiz).
  Fayl: `invitation/static/invitation/models/man.glb`
- Supachadagi kuyov smokingi va kelin ko'ylagi manekenda turadi; ular dastur ichida yasalgan
  (`invitation/static/invitation/js/garments.js`).
- Gullar: dastur ichida yasalgan atirgul guldastalari. Admin panelda o'z gul modelingizni (.glb) yuklashingiz mumkin.
