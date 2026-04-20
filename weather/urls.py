from django.urls import path
from .views import get_monthly_temps

urlpatterns = [
    path("search/", get_monthly_temps),
]
