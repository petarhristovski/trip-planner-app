from django.urls import path
from .views import flight_search
from .views import aviation_search
from .views import duffel_search

urlpatterns = [
    path("search/", flight_search),
    path("aviationsearch/", aviation_search),
    path("duffelsearch/", duffel_search),
]
