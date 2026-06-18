import {useEffect, useState} from "react";
import api from "../api.js";

function HotelsCard({ destination, checkIn, checkOut, adults}) {
    const [hotels, setHotels] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get(`api/hotels/serpapi/?city=${destination}&checkInDate=${checkIn}&checkOutDate=${checkOut}&adults=${adults}`).then(res => {
            setHotels(res.data["hotels"])

            setLoading(false)
        })
    }, []);

    return loading ? <div>Loading...</div> :
        <div>
            {hotels.map(hotel =>
                <div>
                    <h3>{hotel["name"]}</h3>
                    <p>{hotel["description"]}</p>
                    <p>Per night: {hotel?.rate_per_night?.lowest ?? "N/A"}</p>
                    <p>Total price: {hotel?.total_rate?.lowest ?? "N/A"}</p>
                    {hotel?.images?.length > 0 && (
                      <img
                        alt={hotel.name}
                        src={hotel.images[0].original_image}
                        // width={"200px"}
                        height={"200px"}
                      />
                    )}
                    <p>Rating: {hotel["overall_rating"] ? hotel["overall_rating"] : "N/A"}</p>
                    <p>Reviews: {hotel["reviews"] ? hotel["reviews"] : "N/A"}</p>
                </div>
            )}
        </div>
}

export default HotelsCard