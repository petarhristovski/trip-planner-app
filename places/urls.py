from django.urls import path
from . import views

urlpatterns = [
    path("get_restaurant_prices/", views.get_restaurant_prices),
    path("get_top_attractions/", views.get_top_attractions),
    path("itineraries/", views.ItineraryListCreateAPIView.as_view()),
    path("itineraries/<int:pk>/", views.ItineraryDetailAPIView.as_view()),
    path("activities/", views.ActivityListCreateAPIView.as_view()),
    path("activities/<int:pk>/", views.ActivityDetailAPIView.as_view()),

    # path("create_itinerary/", views.ItineraryAPIView.as_view()),
    # path("create_activity/", views.ActivityAPIView.as_view()),
    # path("get_itineraries/", views.ItineraryListAPIView.as_view()),
]
