"""Telegram bot orqali xabar yuborish (qo'shimcha kutubxonasiz)."""
import html
import json
import threading
import urllib.error
import urllib.parse
import urllib.request

from django.utils import timezone

from .models import SiteSettings, Wish


def send_message(token: str, chat_id: str, text: str) -> tuple[bool, str]:
    """Xabar yuboradi. (muvaffaqiyat, xato_matni) qaytaradi."""
    if not token or not chat_id:
        return False, "Bot tokeni yoki chat ID kiritilmagan"
    url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat_id.strip(),
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
    }).encode()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data), timeout=15) as resp:
            body = json.loads(resp.read().decode())
            if body.get("ok"):
                return True, ""
            return False, body.get("description", "Noma'lum xato")[:300]
    except urllib.error.HTTPError as e:
        try:
            desc = json.loads(e.read().decode()).get("description", str(e))
        except Exception:
            desc = str(e)
        return False, desc[:300]
    except Exception as e:  # tarmoq xatosi va h.k.
        return False, str(e)[:300]


def format_wish(wish: Wish, settings: SiteSettings) -> str:
    when = timezone.localtime(wish.created_at).strftime("%d.%m.%Y %H:%M")
    return (
        f"💌 <b>Yangi tabrik!</b>\n"
        f"💍 {html.escape(settings.groom_name)} & {html.escape(settings.bride_name)} to'yi\n\n"
        f"👤 <b>{html.escape(wish.name)}</b>\n"
        f"💬 {html.escape(wish.text)}\n\n"
        f"🕐 {when}"
    )


def send_wish(wish_id: int) -> None:
    """Tilakni Telegramga yuboradi va natijani bazaga yozadi."""
    wish = Wish.objects.filter(pk=wish_id).first()
    if not wish:
        return
    s = SiteSettings.load()
    if not s.telegram_bot_token or not s.telegram_chat_id:
        wish.telegram_status, wish.telegram_error = "no_settings", "Bot tokeni yoki chat ID kiritilmagan"
    else:
        ok, err = send_message(s.telegram_bot_token, s.telegram_chat_id, format_wish(wish, s))
        wish.telegram_status, wish.telegram_error = ("sent", "") if ok else ("failed", err)
    wish.save(update_fields=["telegram_status", "telegram_error"])


def send_wish_async(wish_id: int) -> None:
    """Mehmon kutib qolmasligi uchun fonda yuboradi."""
    threading.Thread(target=send_wish, args=(wish_id,), daemon=True).start()
