from django.shortcuts import render

from rest_framework.decorators import api_view
from rest_framework.response import Response
from .amadeus import search_offers, price_offers

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