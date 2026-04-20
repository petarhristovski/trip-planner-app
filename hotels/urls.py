from django.urls import path
from .views import hotel_search

urlpatterns = [
    path("search/", hotel_search),
]
