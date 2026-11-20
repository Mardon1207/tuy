from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/wishes/', views.wishes_api, name='wishes_api'),
]
