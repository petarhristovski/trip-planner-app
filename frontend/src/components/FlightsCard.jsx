import {useEffect, useState} from "react";
import api from "../api.js";

function FlightsCard({ origin, destination, departure, returnDate}) {
    const [flights, setFlights] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get(`api/flights/duffelsearch/?origin=${origin}&destination=${destination}&date=${departure}&return_date=${returnDate}`).then(res => {
            setFlights(res.data["results"])

            setLoading(false)
        })
    }, [])

    return loading ? <div>Loading...</div> :
        <div>
            {flights.map(flight =>
                <div style={{border: "1px solid black"}}>
                    <p>{flight["slices"][0]["departure_at"].split("T")[1].slice(0, -3)} - {flight["slices"][0]["arrival_at"].split("T")[1].slice(0, -3)}</p>
                    <p>{flight["slices"][0]["origin"]} - {flight["slices"][0]["destination"]}</p>

                    <p>{flight["slices"][1]["departure_at"].split("T")[1].slice(0, -3)} - {flight["slices"][1]["arrival_at"].split("T")[1].slice(0, -3)}</p>
                    <p>{flight["slices"][1]["origin"]} - {flight["slices"][1]["destination"]}</p>

                    <p>{flight["slices"][0]["segments"][0]["airline"]}</p>

                    <p>Total amount: {flight["total_amount"]} {flight["total_currency"]}</p>
                </div>
            )}
        </div>
}

export default FlightsCard