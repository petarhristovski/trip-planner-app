import {useEffect, useState} from "react";
import api from "../api.js";

function RestaurantsCard({destination}) {
    const [average, setAverage] = useState("loading...")
    const [median, setMedian] = useState("loading...")
    const [min, setMin] = useState("loading...")
    const [max, setMax] = useState("loading...")
    const [currency, setCurrency] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get(`api/places/get_restaurant_prices/?city=${destination}`).then(res => {
            setAverage(res.data["average"].toFixed(2))
            setMedian(res.data["median"].toFixed(2))
            setMin(res.data["confidence_interval"][0].toFixed(2))
            setMax(res.data["confidence_interval"][1].toFixed(2))
            setCurrency(res.data["currency"].split("|")[0])

            setLoading(false)
        })
    }, [])

    return loading ? <div>Loading...</div> :
    <div style={{border: "1px solid black", width: "300px", padding: "10px", display: "inline-block"}}>
        <h3>Restaurant prices</h3>
        <p>Average: {average} {currency}</p>
        <p>Median: {median} {currency}</p>
        <p>{min} - {max} {currency}</p>
    </div>
}

export default RestaurantsCard