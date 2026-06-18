import {Link, useNavigate} from "react-router-dom";
import {useEffect, useState} from "react";
import api from "../api.js";
import {DateRangePicker} from "./DateRangePicker.jsx";

function Sidebar() {
    const navigate = useNavigate()

    const [itineraries, setItineraries] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        tripName: "", city:"", tripStartDate: "", tripEndDate: ""
    })
    const [range, setRange] = useState({
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
    });

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get("/api/places/itineraries/")
            .then(res => setItineraries(res.data))
            .finally(() => setLoading(false))
    }, []);

    function handleChange(e) {
        setForm({...form, [e.target.name]: e.target.value})
    }

    async function handleSubmit(e) {
        e.preventDefault()

        try{
            const itineraryResponse = await api.post("/api/places/itineraries/", {
                    name: form.tripName,
                    city: form.city,
                    start: form.tripStartDate,
                    end: form.tripEndDate,
                })

            setShowForm(false)

            setItineraries([...itineraries, itineraryResponse.data])

            const itineraryId = itineraryResponse.data.id

            navigate(`/itinerary/${itineraryId}`)
        }
        catch (error) {
            alert(error.response?.data ? JSON.stringify(error.response.data) : error.message)
        }
    }

    return (
        <div
            style={{
                width: "150px",
                borderRight: "1px solid #ddd",
                padding: "1rem",
            }}
        >
            <button onClick={() => setShowForm(!showForm)}>New Itinerary</button>

            {showForm &&
                <div
                    onClick={() => setShowForm(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.45)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleSubmit}
                        style={{
                            backgroundColor: "#ffffff",
                            padding: "24px",
                            borderRadius: "16px",
                            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
                            width: "100%",
                            maxWidth: "500px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                        }}
                    >
                        <label>Name</label>
                        <input type="text" name={"tripName"} onChange={handleChange} value={form.tripName}/>
                        <label>City</label>
                        <input type="text" name={"city"} onChange={handleChange} value={form.city}/>
                        {/*<label>Start date</label>*/}
                        {/*<input type={"date"} name={"tripStartDate"} onChange={handleChange}/>*/}
                        {/*<label>End date</label>*/}
                        {/*<input type={"date"} name={"tripEndDate"} onChange={handleChange}/>*/}

                        <DateRangePicker
                          value={{ start: null, end: null }}   // controlled range
                          onChange={(range) => {
                              setRange(range)
                              setForm({ ...form, tripStartDate: range.start, tripEndDate: range.end})
                          }} // { start: Date, end: Date }
                          minDate={new Date()}                  // blocks past dates (defaults to today)
                          onClose={() => setOpen(false)}        // fires on Apply or outside click
                        />

                        <input type={"submit"} value={"Add"}/>

                        <button type={"button"} onClick={() => setShowForm(false)}>Cancel</button>
                    </form>
                </div>
            }

            <div style={{ marginTop: "1rem" }}>
                <Link to="/">Search</Link>
            </div>

            <div style={{ marginTop: "1rem" }}>
                <h4>Your itineraries</h4>

                {loading ? <div>Loading...</div> :
                <ul>
                    {itineraries.map(itinerary => <li key={itinerary.id}><Link to={`/itinerary/${itinerary.id}`}>{itinerary.name}</Link></li>)}
                </ul>
                }
            </div>
        </div>
    );
}

export default Sidebar;