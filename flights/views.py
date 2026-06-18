from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .amadeus_client import search_offers
from django.conf import settings
import requests

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
    # for offer in offers:
    #     results.append({
    #         "duration": offer.get("itineraries", [])[0].get("duration", []),
    #         "price": offer.get("price", {}).get("total") + " " + offer.get("price", {}).get("currency"),
    #         "segments": offer.get("itineraries", [])[0].get("segments", [])
    #     })

    return Response(payload, status=status_code)

CITY_AIRPORTS = {
    "paris": ["CDG", "ORY"],
    "london": ["LHR", "LGW"],
    "rome": ["FCO"],
}

@api_view(["GET"])
def aviation_search(request):
    origin = request.query_params.get("origin")
    destination = request.query_params.get("destination")
    departure_date = request.query_params.get("departureDate")
    limit = request.query_params.get("limit", 50)
    offset = request.query_params.get("offset", 0)

    origin_airports = CITY_AIRPORTS.get(origin.lower())
    destination_airports = CITY_AIRPORTS.get(destination.lower())

    if not origin_airports:
        return Response({"error": "origin city not supported"}, status=400)

    if not destination_airports:
        return Response({"error": "destination city not supported"}, status=400)

    access_key = settings.AVIATON_STACK_API_KEY

    all_results = []

    for dep in origin_airports:
        for arr in destination_airports:
            params = {
                "access_key": access_key,
                "dep_iata": dep,
                "arr_iata": arr,
                "limit": limit,
                "offset": offset,
            }

            try:
                r = requests.get(
                    "https://api.aviationstack.com/v1/flights",
                    params=params,
                    timeout=10
                )
                r.raise_for_status()
                data = r.json()
                all_results.extend(data.get("data", []))
            except requests.exceptions.RequestException as e:
                return Response({"error": str(e)}, status=500)

    return Response({
        "origin": origin,
        "destination": destination,
        "results": all_results
    })


# @api_view(["GET"])
# def duffel_search(request):
#     origin = request.GET.get("origin")          # e.g. "LHR"
#     destination = request.GET.get("destination") # e.g. "JFK"
#     departure_date = request.GET.get("date")     # e.g. "2026-06-01"
#     cabin_class = request.GET.get("cabin", "economy")
#     passengers = int(request.GET.get("passengers", 1))
#
#     if not all([origin, destination, departure_date]):
#         return Response({"error": "origin, destination, and date are required"}, status=400)
#
#     headers = {
#         "Authorization": f"Bearer {settings.DUFFEL_API_KEY}",
#         "Duffel-Version": "v2",
#         "Content-Type": "application/json",
#     }
#
#     payload = {
#         "data": {
#             "slices": [
#                 {
#                     "origin": origin,
#                     "destination": destination,
#                     "departure_date": departure_date,
#                 }
#             ],
#             "passengers": [{"type": "adult"} for _ in range(passengers)],
#             "cabin_class": cabin_class,
#         }
#     }
#
#     response = requests.post(
#         "https://api.duffel.com/air/offer_requests",
#         headers=headers,
#         json=payload,
#     )
#
#     if not response.ok:
#         return Response({"error": response.json()}, status=response.status_code)
#
#     offers = response.json()["data"]["offers"]
#
#     results = [
#         {
#             "offer_id": offer["id"],
#             "total_amount": offer["total_amount"],
#             "total_currency": offer["total_currency"],
#             "base_amount": offer["base_amount"],
#             "tax_amount": offer["tax_amount"],
#             "expires_at": offer["expires_at"],
#             "slices": [
#                 {
#                     "origin": s["origin"]["iata_code"],
#                     "destination": s["destination"]["iata_code"],
#                     "departure_at": s["segments"][0]["departing_at"],
#                     "arrival_at": s["segments"][-1]["arriving_at"],
#                     "stops": len(s["segments"]) - 1,  # 0 = direct
#                     "segments": [
#                         {
#                             "airline": seg["operating_carrier"]["name"],
#                             "airline_iata": seg["operating_carrier"]["iata_code"],
#                             "flight_number": seg["operating_carrier_flight_number"],
#                             "aircraft": seg["aircraft"]["name"] if seg.get("aircraft") else None,
#                         }
#                         for seg in s["segments"]
#                     ],
#                 }
#                 for s in offer["slices"]
#             ],
#         }
#         for offer in offers
#     ]
#
#     return Response({"results": results})
    # return Response(response.json())

@api_view(["GET"])
def duffel_search(request):
    origin = request.GET.get("origin")          # e.g. "LHR"
    destination = request.GET.get("destination") # e.g. "JFK"
    departure_date = request.GET.get("date")     # e.g. "2026-06-01"
    return_date = request.GET.get("return_date") # e.g. "2026-06-10" (optional)
    cabin_class = request.GET.get("cabin", "economy")
    passengers = int(request.GET.get("passengers", 1))

    if not all([origin, destination, departure_date]):
        return Response({"error": "origin, destination, and date are required"}, status=400)

    headers = {
        "Authorization": f"Bearer {settings.DUFFEL_API_KEY}",
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
    }

    slices = [
        {
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date,
        }
    ]

    if return_date:
        slices.append({
            "origin": destination,
            "destination": origin,
            "departure_date": return_date,
        })

    payload = {
        "data": {
            "slices": slices,
            "passengers": [{"type": "adult"} for _ in range(passengers)],
            "cabin_class": cabin_class,
        }
    }

    response = requests.post(
        "https://api.duffel.com/air/offer_requests",
        headers=headers,
        json=payload,
    )

    if not response.ok:
        return Response({"error": response.json()}, status=response.status_code)

    offers = response.json()["data"]["offers"]

    results = [
        {
            "offer_id": offer["id"],
            "total_amount": offer["total_amount"],
            "total_currency": offer["total_currency"],
            "base_amount": offer["base_amount"],
            "tax_amount": offer["tax_amount"],
            "expires_at": offer["expires_at"],
            "slices": [
                {
                    "origin": s["origin"]["iata_code"],
                    "destination": s["destination"]["iata_code"],
                    "departure_at": s["segments"][0]["departing_at"],
                    "arrival_at": s["segments"][-1]["arriving_at"],
                    "stops": len(s["segments"]) - 1,  # 0 = direct
                    "segments": [
                        {
                            "airline": seg["operating_carrier"]["name"],
                            "airline_iata": seg["operating_carrier"]["iata_code"],
                            "flight_number": seg["operating_carrier_flight_number"],
                            "aircraft": seg["aircraft"]["name"] if seg.get("aircraft") else None,
                        }
                        for seg in s["segments"]
                    ],
                }
                for s in offer["slices"]
            ],
        }
        for offer in offers
    ]

    return Response({"results": results[:10]})