from django.contrib import admin, messages
from django.shortcuts import redirect
from django.urls import path, reverse
from django.utils.html import format_html

from .models import Photo, SiteSettings, Wish
from .telegram import send_message, send_wish


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    change_form_template = "admin/invitation/sitesettings/change_form.html"
    fieldsets = (
        ("Asosiy", {"fields": ("title", "groom_name", "bride_name", "wedding_date", "wedding_time", "hint_text")}),
        ("To'y manzili", {"fields": ("address_text", "yandex_map_url", "google_map_url")}),
        ("To'yona (karta)", {"fields": ("card_number", "card_holder")}),
        ("Telegram bot (tabriklar shu yerga keladi)", {
            "fields": ("telegram_bot_token", "telegram_chat_id"),
            "description": (
                "1) Telegramda @BotFather ga /newbot yozib bot yarating va tokenni oling.<br>"
                "2) Botingizga /start yozing (guruh bo'lsa — botni guruhga qo'shing).<br>"
                "3) Chat ID ni bilish uchun @userinfobot ga yozing (guruh ID si -100 bilan boshlanadi).<br>"
                "4) Saqlang va pastdagi «Test xabar yuborish» tugmasini bosing."
            ),
        }),
        ("Musiqa va 3D modellar", {"fields": ("music", "character_model", "flower_model")}),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        obj = SiteSettings.load()
        return redirect(reverse("admin:invitation_sitesettings_change", args=[obj.pk]))

    def get_urls(self):
        return [
            path("test-telegram/", self.admin_site.admin_view(self.test_telegram),
                 name="invitation_sitesettings_test"),
        ] + super().get_urls()

    def test_telegram(self, request):
        s = SiteSettings.load()
        ok, err = send_message(
            s.telegram_bot_token, s.telegram_chat_id,
            f"✅ Test xabar: bot to'g'ri ulangan!\n💍 {s.groom_name} & {s.bride_name} to'y taklifnomasi",
        )
        if ok:
            messages.success(request, "Test xabar Telegramga yuborildi!")
        else:
            messages.error(request, f"Yuborilmadi: {err}")
        return redirect(reverse("admin:invitation_sitesettings_change", args=[s.pk]))


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ("preview", "caption", "order")
    list_editable = ("order",)
    list_display_links = ("preview", "caption")

    @admin.display(description="Ko'rinish")
    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:60px;border-radius:6px">', obj.image.url)
        return "-"


@admin.register(Wish)
class WishAdmin(admin.ModelAdmin):
    list_display = ("name", "short_text", "created_at", "telegram_badge", "is_visible")
    list_filter = ("telegram_status", "is_visible")
    list_editable = ("is_visible",)
    search_fields = ("name", "text")
    readonly_fields = ("created_at", "telegram_status", "telegram_error")
    actions = ["resend"]

    @admin.display(description="Tilak")
    def short_text(self, obj):
        return obj.text[:80]

    @admin.display(description="Telegram")
    def telegram_badge(self, obj):
        colors = {"sent": "#16a34a", "failed": "#dc2626", "no_settings": "#d97706", "pending": "#6b7280"}
        return format_html('<b style="color:{}">{}</b>', colors.get(obj.telegram_status, "#000"),
                           obj.get_telegram_status_display())

    @admin.action(description="Tanlanganlarni Telegramga qayta yuborish")
    def resend(self, request, queryset):
        for w in queryset:
            send_wish(w.pk)
        sent = queryset.model.objects.filter(pk__in=queryset.values("pk"), telegram_status="sent").count()
        messages.info(request, f"{sent} ta tilak yuborildi, {queryset.count() - sent} tasi yuborilmadi.")
