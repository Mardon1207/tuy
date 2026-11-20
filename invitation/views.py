import json

from django.templatetags.static import static

from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods

from .models import Photo, SiteSettings, Wish
from .telegram import send_wish_async

UZ_MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul",
             "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"]


def index(request):
    s = SiteSettings.load()
    photos = [
        {"url": p.image.url, "caption": p.caption}
        for p in Photo.objects.all()
    ]
    config = {
        "title": s.title,
        "groom": s.groom_name,
        "bride": s.bride_name,
        "date": s.wedding_date.isoformat(),
        "dateText": s.wedding_date.strftime("%d.%m.%Y"),
        "time": s.wedding_time,
        "monthName": UZ_MONTHS[s.wedding_date.month - 1],
        "hint": s.hint_text,
        "address": s.address_text,
        "yandexUrl": s.yandex_map_url,
        "googleUrl": s.google_map_url,
        "card": s.card_number,
        "cardHolder": s.card_holder,
        "music": s.music.url if s.music else "",
        "characterModel": s.character_model.url if s.character_model else "",
        "flowerModel": s.flower_model.url if s.flower_model else "",
        "manModel": static("invitation/models/man.glb"),
        "photos": photos,
        "wishCount": Wish.objects.filter(is_visible=True).count(),
    }
    return render(request, "invitation/index.html", {"s": s, "config": config})


def _client_ip(request):
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    return fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR", "")


@require_http_methods(["GET", "POST"])
def wishes_api(request):
    if request.method == "GET":
        items = [
            {"name": w.name, "text": w.text, "created": w.created_at.isoformat()}
            for w in Wish.objects.filter(is_visible=True)[:100]
        ]
        return JsonResponse({"items": items, "count": Wish.objects.filter(is_visible=True).count()})

    try:
        data = json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Noto'g'ri so'rov"}, status=400)

    name = str(data.get("name", "")).strip()[:60]
    text = str(data.get("text", "")).strip()[:300]
    if not name:
        return JsonResponse({"error": "Ismingizni yozing"}, status=400)
    if len(text) < 2:
        return JsonResponse({"error": "Tilagingizni yozing"}, status=400)

    # Spamdan himoya: bitta qurilmadan 15 soniyada 1 marta
    key = f"wish-ip-{_client_ip(request)}"
    if cache.get(key):
        return JsonResponse({"error": "Biroz kuting va qayta urinib ko'ring"}, status=429)
    cache.set(key, 1, 15)

    wish = Wish.objects.create(name=name, text=text)
    send_wish_async(wish.pk)
    return JsonResponse({
        "ok": True,
        "item": {"name": wish.name, "text": wish.text, "created": wish.created_at.isoformat()},
        "count": Wish.objects.filter(is_visible=True).count(),
    })
