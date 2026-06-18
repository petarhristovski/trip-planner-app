from django.shortcuts import render

from rest_framework.decorators import api_view
from rest_framework.response import Response
from .amadeus import search_offers, price_offers
from django.conf import settings
import requests
from datetime import datetime
from .models import HotelSearch
from urllib.parse import quote

@api_view(["GET"])
def hotel_search(request):
    cityCode = request.query_params.get("cityCode")
    if not cityCode:
        return Response({"error": "city required"}, status=400)
    status, data = search_offers(cityCode)

    hotels = data.get("data", [])
    print("HOTEL LIST COUNT:", len(hotels))

    results = [h["hotelId"] for h in hotels[:60]]

    adults = int(request.query_params.get("adults", "1"))
    checkInDate = request.query_params.get("checkInDate")
    checkOutDate = request.query_params.get("checkOutDate")

    resultsString1 = ",".join(results[0:20])
    resultsString2 = ",".join(results[20:40])
    resultsString3 = ",".join(results[40:60])

    status1, priceData1 = price_offers(resultsString1, adults, checkInDate, checkOutDate)
    status2, priceData2 = price_offers(resultsString2, adults, checkInDate, checkOutDate)
    status3, priceData3 = price_offers(resultsString3, adults, checkInDate, checkOutDate)

    price_data = priceData1.get("data", []) + priceData2.get("data", []) + priceData3.get("data", [])
    result_final = []

    for hotel in price_data:
        result_final.append({
            "hotelName": hotel["hotel"]["name"],
            "price": hotel["offers"][0]["price"]["total"]
        })

    return Response(result_final, status=status2)

@api_view(["GET"])
def serpapi_hotel_search(request):
    city = request.query_params.get("city")
    check_in_date = request.query_params.get("checkInDate")
    check_out_date = request.query_params.get("checkOutDate")
    adults = request.query_params.get("adults", "1")

    if not all([city, check_in_date, check_out_date]):
        return Response(
            {"error": "city, checkInDate, and checkOutDate are required"},
            status=400
        )

    adults_int = int(adults)
    check_in = datetime.strptime(check_in_date, "%Y-%m-%d").date()
    check_out = datetime.strptime(check_out_date, "%Y-%m-%d").date()

    try:
        cached = HotelSearch.objects.get(
            city=city,
            check_in_date=check_in,
            check_out_date=check_out,
            adults=adults_int
        )

        return Response({"hotels": cached.results})
    except HotelSearch.DoesNotExist:
        pass

    url = (
        f"https://serpapi.com/search.json"
        f"?engine=google_hotels"
        f"&q={quote(city + ' hotels')}"
        f"&check_in_date={check_in_date}"
        f"&check_out_date={check_out_date}"
        f"&adults={adults}"
        f"&api_key={settings.SERP_API_KEY}"
    )

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        properties = response.json().get("properties", [])

        # Save to cache (update if exists, create if not)
        HotelSearch.objects.update_or_create(
            city=city,
            check_in_date=check_in,
            check_out_date=check_out,
            adults=adults_int,
            defaults={"results": properties}
        )

        return Response({"hotels": properties, "cached": False})

    except requests.RequestException as e:
        return Response({"error": str(e)}, status=500)