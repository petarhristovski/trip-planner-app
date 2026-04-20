from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .amadeus_client import search_offers

@api_view(["GET"])
def flight_search(request):
    origin = request.query_params.get("origin")
    destination = request.query_params.get("destination")
    departure_date = request.query_params.get("departureDate")

    if not origin or not destination or not departure_date:
        return Response({"error": "origin, destination, departureDate required"}, status=400)

    adults = int(request.query_params.get("adults", "1"))
    max_results = int(request.query_params.get("max", "20"))
    non_stop = request.query_params.get("nonStop", "false").lower() == "true"
    currency = request.query_params.get("currencyCode", "EUR")
    return_date = request.query_params.get("returnDate")

    status_code, payload = search_offers(
        origin.upper(),
        destination.upper(),
        departure_date,
        adults=adults,
        max=max_results,
        nonStop=non_stop,
        currencyCode=currency,
        returnDate=return_date,
    )

    results = []

    offers = payload.get("data", [])
    for offer in offers:
        results.append({
            "duration": offer.get("itineraries", [])[0].get("duration", []),
            "price": offer.get("price", {}).get("total") + " " + offer.get("price", {}).get("currency"),
            "segments": offer.get("itineraries", [])[0].get("segments", [])
        })

    return Response(results, status=status_code)


