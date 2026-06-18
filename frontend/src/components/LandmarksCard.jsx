import {useEffect, useState} from "react";
import api from "../api.js";

function LandmarksCard({ destination }){
    const [landmarks, setLandmarks] = useState([])
    const [itineraries, setItineraries] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedLandmark, setSelectedLandmark] = useState(null)
    const [existing, setExisting] = useState(false)
    const [mode, setMode] = useState("new")
    const [form, setForm] = useState({
        itineraryId: "", tripName: "", tripStartDate: "", tripEndDate: "", activityName: "", activityDate: "", activityStartTime: "", activityEndTime: ""
    })

    useEffect(() => {
        async function fetchData() {
            try {
                const [landmarksResponse, itinerariesResponse] = await Promise.all([
                    api.get(`/api/places/get_top_attractions/?city=${destination}`),
                    api.get(`/api/places/itineraries/?city=${destination}`),
                ])

                // api.get(`/api/places/get_top_attractions/?city=${destination}`).then(res => setLandmarks(res.data))
                // api.get(`/api/places/itineraries/?city=${destination}`).then(res => setItineraries(res.data))
                setExisting(itinerariesResponse.data.length > 0)
                setMode(itinerariesResponse.data.length > 0 ? "existing" : "new")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, []);

    function handleChange(e) {
        setForm({...form, [e.target.name]: e.target.value})
    }

    async function handleSubmit(e) {
        e.preventDefault()

        try {
            let itineraryId = form.itineraryId

            if (mode === "new") {
                const itineraryResponse = await api.post("/api/places/itineraries/", {
                    name: form.tripName || `${destination} trip`,
                    city: destination,
                    start: form.tripStartDate,
                    end: form.tripEndDate,
                })

                itineraryId = itineraryResponse.data.id
            }

            await api.post("/api/places/activities/", {
                itinerary: itineraryId,
                name: form.activityName || `${selectedLandmark.name} visit`,
                start_time: `${form.activityDate}T${form.activityStartTime}`,
                end_time: `${form.activityDate}T${form.activityEndTime}`,
            })

            setSelectedLandmark(null)
            setForm({
                itineraryId: "",
                tripName: "",
                tripStartDate: "",
                tripEndDate: "",
                activityName: "",
                activityDate: "",
                activityStartTime: "",
                activityEndTime: "",
            })
        } catch (error) {
            alert(error.response?.data ? JSON.stringify(error.response.data) : error.message)
        }
    }

    return loading ? <div>Loading...</div> :
        <div>
            { selectedLandmark ?
            <div>
                <form onSubmit={handleSubmit}>
                    <button type="button" disabled={!existing} onClick={() => setMode("existing")}>Select existing</button><button type="button" onClick={() => setMode("new")}>Create new</button>
                    {mode === "existing" ?
                        <div>
                            <select name={"itineraryId"} value={form.itineraryId} onChange={handleChange}>
                                <option value="">Select an itinerary</option>
                                {
                                    itineraries.map(itinerary => <option key={itinerary.id} value={itinerary.id}>{itinerary.name}</option>)
                                }
                            </select>
                        </div> :
                        <div>
                            <input type="text" name={"tripName"} onChange={handleChange} value={form.tripName ? form.tripName : `${destination} trip`}/>
                            <label>Start date</label>
                            <input type={"date"} name={"tripStartDate"} onChange={handleChange}/>
                            <label>End date</label>
                            <input type={"date"} name={"tripEndDate"} onChange={handleChange}/>
                        </div>
                    }
                    <span>Activity</span>
                    <hr/>
                    <label>Name</label>
                    <input type={"text"} name={"activityName"} onChange={handleChange} value={form.activityName ? form.activityName : `${selectedLandmark.name} visit`}/>
                    <label>Date</label>
                    <input type={"date"} name={"activityDate"} onChange={handleChange} value={form.activityDate}/>
                    <label>Start time</label>
                    <input type={"time"} name={"activityStartTime"} onChange={handleChange} value={form.activityStartTime}/>
                    <label>End time</label>
                    <input type={"time"} name={"activityEndTime"} onChange={handleChange} value={form.activityEndTime}/>

                    <button type="button" onClick={() => setSelectedLandmark(null)}>Cancel</button>
                    <input type={"submit"} value={"Add"}/>
                </form>
            </div> : <div></div>}
            <div>
                {landmarks.map(landmark =>
                    <div style={{border: "1px solid black", width: "200px", height:"100px", padding: "10px", margin:"10px", display: "inline-block"}}>
                        <p>{landmark["name"]}</p>
                        <button type="button" onClick={() => setSelectedLandmark(landmark)}>Add to itinerary</button>
                    </div>
                )}
            </div>
        </div>
}

export default LandmarksCard