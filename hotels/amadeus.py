import time
import requests
from django.conf import settings

_token = {"value": None, "expires_at": 0}

def get_token() -> str:
    now = time.time()
    if _token["value"] and now < _token["expires_at"] - 30:
        return _token["value"]

    url = f"{settings.AMADEUS_BASE_URL}/v1/security/oauth2/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": settings.AMADEUS_CLIENT_ID,
        "client_secret": settings.AMADEUS_CLIENT_SECRET,
    }

    r = requests.post(url, data=data, timeout=20)
    r.raise_for_status()
    j = r.json()

    _token["value"] = j["access_token"]
    _token["expires_at"] = now + int(j.get("expires_in", 1800))
    return _token["value"]

def search_offers(city):
    token = get_token()
    url = "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city"
    params = {
        "cityCode": city,
    }
    r = requests.get(url,params=params, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code, r.json()

def price_offers(hotelId, adults, checkInDate, checkOutDate):
    token = get_token()
    url = "https://test.api.amadeus.com/v3/shopping/hotel-offers"
    params = {
        "hotelIds": hotelId,
        "adults": adults,
        "checkInDate": checkInDate,
        "checkOutDate": checkOutDate
    }
    r = requests.get(url, params=params, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code, r.json()