import {useEffect, useState} from "react";
import api from "../api.js";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function WeatherCard({ destination, departure }) {
    const [max, setMax] = useState("loading...")
    const [min, setMin] = useState("loading...")
    const [avg, setAvg] = useState("loading...")
    const [month, setMonth] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const idx = parseInt(departure.split("-")[1]) - 1
        setMonth(months[idx])

        api.get(`api/weather/search/?city=${destination}`).then(res => {
            setMax(res.data["Mean daily maximum"][idx])
            setMin(res.data["Mean daily minimum"][idx])
            setAvg(res.data["Daily mean"][idx])

        setLoading(false)
        })
    }, [])

    return loading ? <div>Loading...</div> :
    <div style={{border: "1px solid black", width: "300px", padding: "10px", display: "inline-block"}}>
        <h3>Weather in {destination} for month {month}</h3>
        <p>Maximum: {max}</p>
        <p>Minimum: {min}</p>
        <p>Average: {avg}</p>
    </div>
}

export default WeatherCard