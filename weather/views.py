from django.shortcuts import render
from bs4 import BeautifulSoup
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Create your views here.
@api_view(["GET"])
def get_monthly_temps(request):
    city = request.query_params.get("city")
    url = f"https://en.wikipedia.org/wiki/{city}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }

    page = requests.get(url, headers=headers, timeout=10)
    soup = BeautifulSoup(page.text,features="html.parser")
    mean_daily_maximum = None
    mean_daily_minimum = None
    daily_mean = None

    for th in soup.find_all("th", attrs={"scope": "row"}):
        text = th.get_text(strip=True).lower()
        if "daily maximum" in text:
            mean_daily_maximum = th
        if "daily mean" in text:
            daily_mean = th
        if "daily minimum" in text:
            mean_daily_minimum = th

    if not mean_daily_maximum or not daily_mean or not mean_daily_minimum:
        return Response(
            {"error": "Climate row not found"},
            status=404
        )

    mean_daily_maximum_rows = mean_daily_maximum.find_parent("tr")
    mean_daily_maximum_cells = mean_daily_maximum_rows.find_all("td")

    daily_mean_rows = daily_mean.find_parent("tr")
    daily_mean_cells = daily_mean_rows.find_all("td")

    mean_daily_minimum_rows = mean_daily_minimum.find_parent("tr")
    mean_daily_minimum_cells = mean_daily_minimum_rows.find_all("td")

    result = {
        "Mean daily maximum": [],
        "Daily mean": [],
        "Mean daily minimum": []
    }

    for cell in mean_daily_maximum_cells:
        text = cell.get_text(strip=True)
        text_array = text.split("(")
        result["Mean daily maximum"].append(text_array[0] + " °C")

    for cell in daily_mean_cells:
        text = cell.get_text(strip=True)
        text_array = text.split("(")
        result["Daily mean"].append(text_array[0] + " °C")

    for cell in mean_daily_minimum_cells:
        text = cell.get_text(strip=True)
        text_array = text.split("(")
        result["Mean daily minimum"].append(text_array[0] + " °C")

    return Response(result)