import { useSearchParams } from "react-router-dom"
import WeatherCard from "../components/WeatherCard.jsx";
import RestaurantsCard from "../components/RestaurantsCard.jsx";
import FlightsCard from "../components/FlightsCard.jsx";
import HotelsCard from "../components/HotelsCard.jsx";
import LandmarksCard from "../components/LandmarksCard.jsx";
import {cityCodes} from "../utils/cityCodes.js";

function Results(){
    const [searchParams] = useSearchParams()
    const origin = searchParams.get("origin")
    const destination = searchParams.get("destination")
    const departure = searchParams.get("departure")
    const returnDate = searchParams.get("returnDate")
    const passengers = searchParams.get("passengers") || "1"

    return (
        <div>
            <WeatherCard destination={destination} departure={departure} />
            <RestaurantsCard destination={destination} />
            <FlightsCard origin={cityCodes[origin]} destination={cityCodes[destination]} departure={departure} returnDate={returnDate}/>
            <HotelsCard destination={destination} checkIn={departure} checkOut={returnDate} adults={passengers} />
            <LandmarksCard destination={destination} />
        </div>
    )
}

export default Results