from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.site_header = "To'y taklifnomasi — boshqaruv paneli"
admin.site.site_title = "To'y taklifnomasi"
admin.site.index_title = "Boshqaruv"

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('invitation.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Admin yuklagan rasm/musiqa fayllari (nginx sozlanmagan hostinglar uchun ham ishlaydi)
    urlpatterns += [re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT})]
