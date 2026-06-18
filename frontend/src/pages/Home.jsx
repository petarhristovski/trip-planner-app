import {useEffect, useState} from "react"
import api from "../api.js"
import { useNavigate } from "react-router-dom"

import {DateRangePicker} from "../components/DateRangePicker.jsx";

import { cityCodes} from "../utils/cityCodes.js";

function Home(){
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const cityNames = Object.keys(cityCodes)
    const [form, setForm] = useState({
        origin: "", destination: "", departure: "", returnDate: "", passengers: 1
    })
    const [range, setRange] = useState({
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
    });

    useEffect(() => {
        api.get("/api/auth/me/").then(res => setUser(res.data))

        setLoading(false)
    }, [])

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = (e) => {
        setLoading(true)
        e.preventDefault()

        const params = new URLSearchParams({
            ...form,
            passengers: String(form.passengers)
        }).toString()
        navigate(`/results?${params}`)
    }

    return(
        loading ? <div>Loading...</div> :
        <div>
            <h2>Where to, {user ? user.username : "traveler"}? </h2>

            <form onSubmit={handleSubmit}>
                <input name="origin" type="text" list="origin-city-options" placeholder="Origin" value= {form.origin} onChange={handleChange} />
                <input name="destination" type="text" list="origin-city-options" placeholder="Destination" value={form.destination} onChange={handleChange} />
                <datalist id="origin-city-options">
                    {cityNames.map((city) => (
                        <option key={city} value={city} />
                    ))}
                </datalist>
                {/*<input name="departure" type="date" onChange={handleChange} />*/}
                {/*<input name="returnDate" type="date" onChange={handleChange} />*/}
                <DateRangePicker
                  value={{ start: null, end: null }}   // controlled range
                  onChange={(range) => {
                      setRange(range)
                      setForm({ ...form, departure: range.start, returnDate: range.end})
                      console.log(form)
                      console.log(range)
                  }} // { start: Date, end: Date }
                  minDate={new Date()}                  // blocks past dates (defaults to today)
                  onClose={() => setOpen(false)}        // fires on Apply or outside click
                />
                {" "}
                <input name="passengers" type="number" value="1" min="1" onChange={handleChange} />
                <input type="submit" value="Search" />
            </form>
        </div>
    )
}

export default Home