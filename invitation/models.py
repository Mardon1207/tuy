import datetime

from django.db import models


class SiteSettings(models.Model):
    """Taklifnomaning barcha sozlamalari (bitta yozuv bo'ladi)."""

    # --- Asosiy ma'lumotlar ---
    title = models.CharField("Sarlavha", max_length=100, default="To'yga Taklifnoma")
    groom_name = models.CharField("Kuyov ismi", max_length=60, default="Jasur")
    bride_name = models.CharField("Kelin ismi", max_length=60, default="Madina")
    wedding_date = models.DateField("To'y sanasi", default=datetime.date(2027, 1, 1))
    wedding_time = models.CharField("To'y vaqti", max_length=20, default="18:00", blank=True)
    hint_text = models.CharField(
        "Boshlang'ich yordam matni", max_length=200, blank=True,
        default="O'ngdagi doira bilan yuring · ekranni surib aylantiring\nRasmga bosing — yaqindan ko'rasiz",
    )

    # --- Manzil ---
    address_text = models.TextField("Manzil matni", default="Yakka Saroy, Abdulla Qahhor ko'chasi, 40")
    yandex_map_url = models.URLField("Yandex xarita havolasi", max_length=500, blank=True,
                                     default="https://yandex.com/maps/?text=Yakka%20Saroy%20Toshkent")
    google_map_url = models.URLField("Google xarita havolasi", max_length=500, blank=True,
                                     default="https://maps.google.com/?q=Yakka+Saroy+Tashkent")

    # --- To'yona (karta) ---
    card_number = models.CharField("Karta raqami", max_length=30, default="5614 6887 1922 5830")
    card_holder = models.CharField("Karta egasi", max_length=80, blank=True, default="")

    # --- Telegram ---
    telegram_bot_token = models.CharField(
        "Telegram bot tokeni", max_length=200, blank=True,
        help_text="@BotFather dan olingan token. Masalan: 123456789:AAH...",
    )
    telegram_chat_id = models.CharField(
        "Telegram chat ID", max_length=100, blank=True,
        help_text="Tabriklar yuboriladigan chat/guruh/kanal ID si. Masalan: 123456789 yoki -100123456789",
    )

    # --- Media ---
    music = models.FileField("Fon musiqasi (mp3)", upload_to="music/", blank=True)
    character_model = models.FileField(
        "Qahramon 3D modeli (.glb, ixtiyoriy)", upload_to="models/", blank=True,
        help_text="Bo'sh qoldirilsa, kostyum kiygan odam ishlatiladi. GLB faylida 'Idle' va 'Walk' animatsiyalari bo'lishi kerak.",
    )
    flower_model = models.FileField(
        "Gul 3D modeli (.glb, ixtiyoriy)", upload_to="models/", blank=True,
        help_text="Bo'sh qoldirilsa, atirgul guldastalari ishlatiladi. Yuklangan guldasta har bir vazaga qo'yiladi.",
    )

    class Meta:
        verbose_name = "Sozlamalar"
        verbose_name_plural = "Sozlamalar"

    def __str__(self):
        return "Taklifnoma sozlamalari"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class Photo(models.Model):
    image = models.ImageField("Rasm", upload_to="photos/")
    caption = models.CharField("Izoh", max_length=150, blank=True)
    order = models.PositiveIntegerField("Tartib", default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Rasm"
        verbose_name_plural = "Devordagi rasmlar"

    def __str__(self):
        return self.caption or f"Rasm #{self.pk}"


class Wish(models.Model):
    STATUS_CHOICES = [
        ("pending", "Kutilmoqda"),
        ("sent", "Yuborildi"),
        ("failed", "Xatolik"),
        ("no_settings", "Bot sozlanmagan"),
    ]

    name = models.CharField("Ism", max_length=60)
    text = models.TextField("Tilak", max_length=300)
    created_at = models.DateTimeField("Vaqti", auto_now_add=True)
    is_visible = models.BooleanField("Saytda ko'rinsin", default=True)
    telegram_status = models.CharField("Telegram holati", max_length=20, choices=STATUS_CHOICES, default="pending")
    telegram_error = models.CharField("Xatolik matni", max_length=300, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Tilak"
        verbose_name_plural = "Tilaklar (tabriklar)"

    def __str__(self):
        return f"{self.name}: {self.text[:40]}"
