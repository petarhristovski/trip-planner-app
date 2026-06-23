import json
from urllib.parse import urljoin
import requests
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from bs4 import BeautifulSoup
import re
import numpy as np
from scipy.stats import t
from rest_framework import generics
from requests.structures import CaseInsensitiveDict

from django.conf import settings

from places.models import Itinerary, PriceAnalysis, Activity
from places.serializers import ItinerarySerializer, ActivitySerializer

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
# OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

def safe_json(response):
    try:
        return response.json()
    except json.JSONDecodeError:
        raise ValueError(
            f"Non-JSON response. status={response.status_code} "
            f"content-type={response.headers.get('Content-Type')} "
            f"preview={response.text[:200]!r}"
        )

def get_country_from_city(city):
    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": city,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
        "accept-language": "en"
    }

    headers = {
        "User-Agent": "restaurant_app/1.0 (contact: pepipetar345@gmail.com)"
    }

    r = requests.get(url, params=params, headers=headers)
    data = r.json()

    if not data:
        return None

    return data[0]["address"]["country"]

def get_city_coordinates(city_name):
    response = requests.get(
        NOMINATIM_URL,
        params={
            "q": city_name,
            "format": "json",
            "limit": 1
        },
        headers={"User-Agent": "restaurant_app/1.0 (contact: pepipetar345@gmail.com)"}
    )

    response.raise_for_status()
    data = response.json()

    if not data:
        raise ValueError("City not found")

    return float(data[0]["lat"]), float(data[0]["lon"])


def get_restaurants(city_name):
    lat, lon = get_city_coordinates(city_name)

    overpass_query = f"""
    [out:json][timeout:60];
    (
      node["amenity"="restaurant"](around:2000,{lat},{lon});
      way["amenity"="restaurant"](around:2000,{lat},{lon});
      relation["amenity"="restaurant"](around:2000,{lat},{lon});
    );
    out center tags;
    """

    response = requests.post(
        OVERPASS_URL,
        data=overpass_query.encode("utf-8"),
        headers={"User-Agent": "restaurant-script/1.0"}
    )

    # print("STATUS:", response.status_code)
    # print("CONTENT-TYPE:", response.headers.get("Content-Type"))
    # print("TEXT PREVIEW:", response.text[:300])

    response.raise_for_status()
    # return safe_json(response)
    return response.json()

TIMEOUT = 6

MENU_PATHS_BY_COUNTRY = {

# Western Europe
"Andorra": ["carta"],
"Austria": ["speisekarte", "karte"],
"Belgium": ["carte", "menukaart"],
"France": ["carte"],
"Germany": ["speisekarte", "karte"],
"Ireland": ["food", "drinks"],
"Luxembourg": ["carte"],
"Monaco": ["carte"],
"Netherlands": ["menukaart"],
"Switzerland": ["speisekarte", "carte"],

# Southern Europe
"Croatia": ["jelovnik"],
"Greece": ["menou"],
"Italy": ["carta", "menù"],
"Portugal": ["ementa"],
"San Marino": ["carta"],
"Spain": ["carta"],

# Central Europe
"Czechia": ["jidelnilistek"],
"Hungary": ["etlap", "ital", "menu"],
"Poland": ["karta"],
"Slovakia": ["jedalny-listok"],
"Slovenia": ["jedilni-list"],

# Eastern Europe
"Moldova": ["meniu"],
"Romania": ["meniu"],

# Balkans
"Bosnia and Herzegovina": ["menu", "jelovnik"],
"Montenegro": ["menu", "jelovnik"],
"Serbia": ["jelovnik"],

# Nordics
"Denmark": ["menukort"],
"Norway": ["meny"],
"Sweden": ["meny"],
}

CURRENCY_REGEX_BY_COUNTRY = {

# Balkans
"Serbia": "RSD|дин|din",
"Bosnia and Herzegovina": "BAM|KM",
"North Macedonia": "MKD|ден|den",
"Albania": "ALL|lek",

# Central / Eastern Europe
"Poland": "PLN|zł",
"Czechia": "CZK|Kč",
"Hungary": "HUF|Ft",
"Romania": "RON|lei|leu",
"Bulgaria": "BGN|лв",
"Moldova": "MDL|lei",
"Ukraine": "UAH|₴|грн",
"Belarus": "BYN|Br",
"Russia": "RUB|₽|руб",

# Nordics
"Sweden": "SEK|kr",
"Norway": "NOK|kr",
"Denmark": "DKK|kr",
"Iceland": "ISK|kr",

# Western Europe (non-euro)
"United Kingdom": "GBP|£",
"Switzerland": "CHF|Fr",
"Liechtenstein": "CHF|Fr",

# Caucasus
"Georgia": "GEL|₾|lari",
"Armenia": "AMD|֏|dram",
"Azerbaijan": "AZN|₼|manat",

# Turkey
"Turkey": "TRY|₺|TL"
}

def try_common_menu_paths(website_url: str, country: str) -> list[str]:
    """
    Returns a list of menu URLs that respond successfully (200 OK).
    """
    found = []

    COMMON_MENU_PATHS = [
        "/menu",
        "/menus",
        "/food",
        "/drinks",
        "/menu.pdf",
        "/menus.pdf",
        "/en/menu",
        "/food-menu",
        "/drink-menu",
        "/carte"
    ]

    paths = MENU_PATHS_BY_COUNTRY.get(country, [])
    menu_country_with_pdf = [p + ".pdf" for p in paths]
    
    COMMON_MENU_PATHS.extend(paths)
    COMMON_MENU_PATHS.extend(menu_country_with_pdf)

    for path in COMMON_MENU_PATHS:
        candidate = urljoin(website_url, path)

        try:
            # HEAD first to avoid downloading large PDFs; some servers don't support HEAD
            r = requests.head(candidate, headers={"User-Agent": "restaurant_app/1.0 (contact: pepipetar345@gmail.com)"}, timeout=TIMEOUT, allow_redirects=True)

            if r.status_code == 405:  # Method Not Allowed -> fallback to GET
                r = requests.get(candidate, headers={"User-Agent": "restaurant_app/1.0 (contact: pepipetar345@gmail.com)"}, timeout=TIMEOUT, allow_redirects=True)

            if r.status_code == 200:
                found.append(candidate)

        except requests.RequestException:
            continue

    return found

def find_menu_links(home_url, country):
    try:
        r = requests.get(
            home_url,
            headers={"User-Agent": "restaurant_app/1.0 (contact: pepipetar345@gmail.com)"},
            timeout=6,
            allow_redirects=True
        )
        r.raise_for_status()
    except requests.RequestException:
        return []
    soup = BeautifulSoup(r.text, "html.parser")

    keywords = [
        "menu",
        "menus",
        "food",
        "drinks",
        "wine",
        "food-menu",
        "drink-menu",
        "etlap",
        "carta"
        "carte"
    ]

    keywords.extend(MENU_PATHS_BY_COUNTRY.get(country, []))

    candidates = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = a.get_text().lower()

        if any(keyword in href.lower() or keyword in text
               for keyword in keywords):
            full_url = urljoin(home_url, href)
            candidates.append(full_url)

    return list(set(candidates)) + try_common_menu_paths(home_url,country)

def extract_prices(menu_links, country):
    all_prices = []

    currency_regex = CURRENCY_REGEX_BY_COUNTRY.get(country, "€|EUR")

    for link in menu_links:
        try:
            r = requests.get(
                link,
                headers={"User-Agent": "restaurant_app/1.0 (contact: pepipetar345@gmail.com)"},
                timeout=6,
                allow_redirects=True
            )
            r.raise_for_status()
        except requests.RequestException:
            continue

        try:
            soup = BeautifulSoup(r.text, "html.parser")
        except Exception as e:
            print("BeautifulSoup failed for:", link, e)
            continue

        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        text = soup.get_text(" ", strip=True)
        text = text.replace("\xa0", " ")

        price_pattern = (
            # prefix: €14, EUR 14,50, Ft 3500, HUF 3.500
            rf"(?:{currency_regex})\s?(\d{{1,4}}(?:[.,]\d{{3}}|\d{{0,3}})(?:[.,]\d{{1,2}})?)"
            r"|"
            # suffix: 14,50 EUR, 3500 Ft, 3.500 HUF, 3500,-
            rf"(\d{{1,4}}(?:[.,]\d{{3}}|\d{{0,3}})(?:[.,]\d{{1,2}})?)\s?(?:{currency_regex}|,-)"
        )

        prices = re.findall(price_pattern, text, flags=re.IGNORECASE)

        for match in prices:
            raw = match[0] if match[0] else match[1]
            if not raw:
                continue

            # Remove thousand separators (3.500 -> 3500, 3,500 -> 3500)
            # but only if the separator is followed by exactly 3 digits
            normalized = re.sub(r"[.,](\d{3})$", r"\1", raw)
            # Then handle decimal comma (14,50 -> 14.50)
            normalized = normalized.replace(",", ".").replace(" ", "")

            try:
                value = float(normalized)
                if value >= 5:
                    all_prices.append(value)
            except ValueError:
                continue

    return all_prices


@api_view(["GET"])
def get_restaurant_prices(request):
    city = request.query_params.get("city", "Budapest")

    cached = PriceAnalysis.objects.filter(city=city).order_by("-created_at").first()

    if cached:
        return Response({
            "average": cached.average_price,
            "median": cached.median_price,
            "confidence_interval": [cached.confidence_interval_lower, cached.confidence_interval_upper],
            "n": cached.sample_count,
            "currency": cached.currency,
            "created_at": cached.created_at,
        })

    country = get_country_from_city(city)
    data = get_restaurants(city)
    restaurants_data = data["elements"][:50]
    result = []
    links = []
    for restaurant in restaurants_data:
        tags = restaurant.get("tags", {})
        website = tags.get("contact:website") or tags.get("website")
        if not website:
            continue

        menu_links = find_menu_links(website, country)
        links.append(menu_links)
        result.extend(extract_prices(menu_links, country))

    result_np = np.array(result)
    q1, q3 = np.quantile(result_np, [0.25, 0.75])
    IQR = q3 - q1
    lower_bound = q1 - 1.5 * IQR
    upper_bound = q3 + 1.5 * IQR
    result = [p for p in result if lower_bound <= p <= upper_bound]
    result_np = np.array(result)
    s = np.std(result_np, ddof=1)
    Xbar = np.mean(result_np)
    n = len(result_np)
    alpha = 0.05
    ci = [Xbar + t.ppf(alpha/2, df = n-1) * (s / np.sqrt(n)), Xbar + t.ppf(1 - alpha/2, df = n-1) * (s / np.sqrt(n))]

    PriceAnalysis.objects.create(
        city=city,
        country=country,
        average_price=float(np.mean(result_np)),
        median_price=float(np.median(result_np)),
        confidence_interval_lower=ci[0],
        confidence_interval_upper=ci[1],
        currency=CURRENCY_REGEX_BY_COUNTRY.get(country, "€|EUR"),
        sample_count=n
    )

    return Response({
        "restaurant_data": restaurants_data,
        "links": links,
        "array": result,
        "average": float(np.mean(result_np)),
        "median": float(np.median(result_np)),
        "confidence_interval": ci,
        "currency": CURRENCY_REGEX_BY_COUNTRY.get(country, "€|EUR"),
        "n": n
    })

# @api_view(["GET"])
# def get_top_attractions(request):
#     city = request.query_params.get("city")
#     # lat, lon = get_city_coordinates(city)
#
#     url = "https://places-api.foursquare.com/places/search"
#     headers = {
#         "Authorization": f"Bearer {settings.FOURSQUARE_API_KEY}",
#         "X-Places-Api-Version": "2025-06-17",
#     }
#     params = {
#         "near": f"{city}",
#         "categories": "16000,10027,10028",  # landmarks + museums + historic sites
#         # "query": "restaurant",
#         "sort": "POPULARITY",
#         "limit": 20
#     }
#
#     r = requests.get(url, headers=headers, params=params)
#     r.raise_for_status()
#     data_full = r.json()
#     data = data_full["results"]
#     result = []
#     API_KEY = settings.GEOAPIFY_API_KEY
#
#     for landmark in data:
#         name = landmark["name"]
#         url = "https://api.geoapify.com/v2/places"
#
#         lat = landmark["latitude"]
#         lon = landmark["longitude"]
#
#         params = {
#             "text": f"{name}",
#             "bias": f"proximity:{lon},{lat}",
#             "categories": "tourism.attraction",
#             "limit": 1,
#             "apiKey": API_KEY
#         }
#
#         resp = requests.get(url, params=params)
#         data = resp.json()
#
#         place_id = data["features"][0]["properties"]["place_id"]
#
#         url = "https://api.geoapify.com/v2/place-details"
#
#         params = {
#             "id": place_id,
#             "apiKey": API_KEY
#         }
#
#         resp = requests.get(url, params=params)
#         geo_data = resp.json()
#
#         # if "tourism.attraction.artwork" in geo_data["features"][0]["properties"]["categories"]:
#         #     result.append({
#         #         "name": landmark["name"],
#         #     })
#         # else:
#         result.append({
#             "name": landmark["name"],
#             "placedetails": resp.json()
#         })
#
#     return Response(result)

@api_view(["GET"])
def get_top_attractions(request):
    city = request.query_params.get("city")
    base_headers = {
        "Authorization": f"Bearer {settings.FOURSQUARE_API_KEY}",
        "X-Places-Api-Version": "2025-06-17",
    }

    # 1. Search for popular attractions in the city
    search_url = "https://places-api.foursquare.com/places/search"
    search_params = {
        "near": city,
        "categories": "16000,10027,10028",
        "sort": "POPULARITY",
        "limit": 20,
    }
    r = requests.get(search_url, headers=base_headers, params=search_params)
    r.raise_for_status()
    results = r.json()["results"]

    # return Response(results)

    attractions = []
    for place in results:
        # fsq_id = place["fsq_place_id"]
        #
        # # 2. Get details for photo + hours
        # details_url = f"https://places-api.foursquare.com/places/{fsq_id}"
        # details_params = {"fields": "name,photos,hours"}
        # d = requests.get(details_url, headers=base_headers, params=details_params)
        # # d.raise_for_status()
        # details = d.json()
        #
        # # Build photo URL if available
        # photo_url = None
        # if details.get("photos"):
        #     photo = details["photos"][0]
        #     photo_url = f"{photo['prefix']}original{photo['suffix']}"

        if "(" in place["name"]:
            name = place["name"].split("(")[0][:-1]
        else:
            name = place["name"]

        attractions.append({
            "name": name,
        })

    return Response(attractions)

class ItineraryListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ItinerarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Itinerary.objects.filter(user=self.request.user)
        city = self.request.query_params.get("city")

        if city:
            queryset = queryset.filter(city__iexact=city.strip())

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ItineraryDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ItinerarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Itinerary.objects.filter(user=self.request.user)

class ActivityListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Activity.objects.filter(itinerary__user=self.request.user)

    def perform_create(self, serializer):
        serializer.save()

class ActivityDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Activity.objects.filter(itinerary__user=self.request.user)
