from django.urls import path
from .views import hotel_search
from .views import serpapi_hotel_search

urlpatterns = [
    path("search/", hotel_search),
    path("serpapi/", serpapi_hotel_search),
]
