import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api.js";

const HOURS = Array.from({ length: 15 }, (_, index) => index + 9);
const HOUR_MS = 60 * 60 * 1000;
const ACTIVITY_COLORS = [
    "#B8D4FF",
    "#B6E7DB",
    "#FFC2BA",
    "#D8C7FF",
    "#FFCCE1",
    "#BFE8C6",
    "#C7E3FF",
    "#C7EEF0",
];

function hashString(value) {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) % 360;
    }

    return hash;
}

function getActivityColor(activity) {
    const seed = String(activity.id ?? activity.name ?? activity.start_time);
    const colorIndex = hashString(seed) % ACTIVITY_COLORS.length;

    return ACTIVITY_COLORS[colorIndex];
}

function getCellRange(dayKey, hour) {
    const start = new Date(`${dayKey}T${String(hour).padStart(2, "0")}:00:00Z`);

    return {
        start,
        end: new Date(start.getTime() + HOUR_MS),
    };
}

function getOverlap(activity, cellStart, cellEnd) {
    const overlapStart = Math.max(activity.startDate.getTime(), cellStart.getTime());
    const overlapEnd = Math.min(activity.endDate.getTime(), cellEnd.getTime());

    if (overlapEnd <= overlapStart) {
        return null;
    }

    return {
        overlapStart,
        overlapEnd,
        duration: overlapEnd - overlapStart,
        startPct: ((overlapStart - cellStart.getTime()) / HOUR_MS) * 100,
        endPct: ((overlapEnd - cellStart.getTime()) / HOUR_MS) * 100,
    };
}

function toDateKey(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
    });
}

function buildDays(start, end) {
    const days = [];
    const current = new Date(`${start}T00:00:00Z`);
    const last = new Date(`${end}T00:00:00Z`);

    while (current <= last) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return days;
}

function buildGrid(itinerary) {
    const activities = (itinerary.items ?? []).map(activity => ({
        ...activity,
        startDate: new Date(activity.start_time),
        endDate: new Date(activity.end_time),
        color: getActivityColor(activity),
    }));

    const days = buildDays(itinerary.start, itinerary.end);

    return days.map(day => {
        const dayKey = toDateKey(day);
        const slots = Array.from({ length: HOURS.length }, () => null);

        HOURS.forEach((hour, hourIndex) => {
            const { start: cellStart, end: cellEnd } = getCellRange(dayKey, hour);
            let bestSlot = null;

            activities.forEach(activity => {
                const overlap = getOverlap(activity, cellStart, cellEnd);

                if (!overlap) {
                    return;
                }

                if (!bestSlot || overlap.duration > bestSlot.overlap.duration) {
                    bestSlot = {
                        activity,
                        overlap,
                    };
                }
            });

            slots[hourIndex] = bestSlot;
        });

        return {
            day,
            slots,
        };
    });
}

function Itinerary() {
    const { id } = useParams()
    const [itinerary, setItinerary] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        activityName: "", activityDate: "", activityStartTime: "", activityEndTime: ""
    })

    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get(`/api/places/itineraries/${id}`)
            .then(res => setItinerary(res.data))
            .finally(() => setLoading(false))
    }, [id]);

    function handleChange(e) {
        setForm({...form, [e.target.name]: e.target.value})
    }

    async function handleSubmit(e) {
        e.preventDefault()

        const res = await api.post("/api/places/activities/", {
            itinerary: itinerary.id,
            name: form.activityName,
            start_time: `${form.activityDate}T${form.activityStartTime}`,
            end_time: `${form.activityDate}T${form.activityEndTime}`,
        })

        setItinerary(prev => ({
            ...prev,
            items: [...(prev?.items ?? []), res.data],
        }))

        setForm({
                activityName: "",
                activityDate: "",
                activityStartTime: "",
                activityEndTime: "",
        })

        setShowForm(false)
    }

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!itinerary) {
        return <div>Itinerary not found.</div>;
    }

    const grid = buildGrid(itinerary);

    return (
    <div>
        <h2>{itinerary.name}</h2>

        <button onClick={() => setShowForm(!showForm)}>New Activity</button>

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
                    maxWidth: "420px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                }}
            >
                <label>Name</label>
                <input type={"text"} name={"activityName"} onChange={handleChange} value={form.activityName}/>
                <label>Date</label>
                <input type={"date"} name={"activityDate"} onChange={handleChange} value={form.activityDate}/>
                <label>Start time</label>
                <input type={"time"} name={"activityStartTime"} onChange={handleChange} value={form.activityStartTime}/>
                <label>End time</label>
                <input type={"time"} name={"activityEndTime"} onChange={handleChange} value={form.activityEndTime}/>

                <button type={"button"} onClick={() => setShowForm(false)}>Cancel</button>
                <input type={"submit"} value={"Add"}/>
            </form>
        </div>
        }

        <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
            <tr>
                <th style={{ border: "1px solid #ccc", padding: "8px" }}>Time</th>
                {grid.map(({ day }, index) => (
                    <th
                        key={toDateKey(day)}
                        style={{ border: "1px solid #ccc", padding: "8px" }}
                    >
                        {`Day ${index + 1} (${toDateKey(day)})`}
                    </th>
                ))}
            </tr>
            </thead>
            <tbody>
                {HOURS.map((hour, hourIndex) => (
                    <tr key={hour}>
                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>
                            {`${String(hour).padStart(2, "0")}:00`}
                        </th>
                        {grid.map(({ day, slots }) => {
                            const slot = slots[hourIndex];
                            const isActivityCell = Boolean(slot?.activity);
                            const showLabel = isActivityCell
                                && slot.overlap?.overlapStart === slot.activity.startDate.getTime();
                            const startPct = slot?.overlap?.startPct ?? 0;
                            const endPct = slot?.overlap?.endPct ?? 100;
                            const hasPartialFill = isActivityCell && (startPct > 0 || endPct < 100);
                            const touchesTopEdge = isActivityCell && startPct === 0;
                            const touchesBottomEdge = isActivityCell && endPct === 100;
                            const cellStyle = {
                                border: "1px solid #ccc",
                                borderTopColor: touchesTopEdge ? slot.activity.color : "#ccc",
                                borderBottomColor: touchesBottomEdge ? slot.activity.color : "#ccc",
                                padding: "8px",
                                verticalAlign: "top",
                                height: "50px",
                                position: "relative",
                                backgroundColor: isActivityCell ? "#fff" : "#fff",
                                backgroundImage: isActivityCell
                                    ? hasPartialFill
                                        ? `linear-gradient(to bottom, transparent 0%, transparent ${startPct}%, ${slot.activity.color} ${startPct}%, ${slot.activity.color} ${endPct}%, transparent ${endPct}%, transparent 100%)`
                                        : `linear-gradient(to bottom, ${slot.activity.color}, ${slot.activity.color})`
                                    : "none",
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "100% 100%",
                                color: "#111827",
                                fontWeight: isActivityCell ? 600 : "normal",
                            };

                            return (
                                <td
                                    key={`${toDateKey(day)}-${hour}`}
                                    style={cellStyle}
                                >
                                    {showLabel ? (
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: `${startPct}%`,
                                                left: "8px",
                                                right: "8px",
                                                zIndex: 1,
                                                color: "#111827",
                                                textShadow: "0 1px 0 rgba(255, 255, 255, 0.65)",
                                            }}
                                        >
                                            <strong>{slot.activity.name}</strong>
                                            <div>{`${formatTime(new Date(slot.activity.start_time))} - ${formatTime(new Date(slot.activity.end_time))}`}</div>
                                        </div>
                                    ) : null}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
    );
}

export default Itinerary