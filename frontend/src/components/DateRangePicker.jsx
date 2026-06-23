import { useState, useRef, useEffect, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ACCENT = "#60A5FA";
const ACCENT_LIGHT = "rgba(96,165,250,0.12)";
const ACCENT_PREVIEW = "rgba(96,165,250,0.06)";

// ─── Utilities ───────────────────────────────────────────────────────────────

const startOfDay = (d) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

const toKey = (d) =>
  d ? d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate() : null;

const sameDay = (a, b) => a && b && toKey(a) === toKey(b);

const formatDisplay = (d) =>
  d
    ? d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const firstDOW = (year, month) => new Date(year, month, 1).getDay();

const addMonths = (year, month, delta) => {
  let m = month + delta;
  let y = year;
  while (m > 11) { m -= 12; y++; }
  while (m < 0)  { m += 12; y--; }
  return { year: y, month: m };
};

const nightsBetween = (start, end) =>
  start && end ? Math.round((end - start) / 86_400_000) : 0;

// ─── Styles (plain objects — no CSS-in-JS dependency) ────────────────────────

const S = {
  // Outer wrapper – centres the demo
  shell: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    display: "inline-block",
    // display: "flex",
    // flexDirection: "column",
    // alignItems: "center",
    // gap: "12px",
    // padding: "32px 16px",
  },

  // Two-field bar
  inputRow: {
    display: "flex",
    border: "1.5px solid #122033",
    borderRadius: "12px",
    overflow: "hidden",
    width: "310px",
    maxWidth: "330px",
    maxHeight: "52px",
    background: "#071025",
    cursor: "pointer",
  },
  field: (active) => ({
    flex: 1,
    padding: "8px 20px",
    borderRight: "1px solid #122033",
    background: active ? "#0f1724" : "#071025",
    transition: "background 0.15s",
    userSelect: "none",
  }),
  fieldLast: (active) => ({
    flex: 1,
    padding: "8px 20px",
    background: active ? "#0f1724" : "#071025",
    transition: "background 0.15s",
    userSelect: "none",
  }),
  fieldLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#9aa4b2",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "4px",
  },
  fieldValue: (hasValue) => ({
    fontSize: "15px",
    fontWeight: hasValue ? 500 : 400,
    color: hasValue ? "#E6EEF8" : "#89A0B6",
  }),

  // Floating panel
  panel: {
    background: "#071025",
    border: "1px solid #122033",
    borderRadius: "16px",
    padding: "24px",
    width: "100%",
    maxWidth: "660px",
    boxShadow: "0 8px 32px rgba(2,6,23,0.6)",
  },
  monthsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "32px",
  },

  // Month header
  monthNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
  },
  navBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    border: "1px solid #122033",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    color: "#C7D2E6",
    lineHeight: 1,
    transition: "background 0.12s",
  },
  navBtnHidden: { visibility: "hidden" },
  monthTitle: { fontSize: "15px", fontWeight: 600, color: "#E6EEF8" },

  // Day grid
  dayHeaders: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: "6px",
  },
  dayHeader: {
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 500,
    color: "#8FA0B3",
    padding: "4px 0",
  },
  daysGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "1px",
  },

  // Footer
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid #122033",
    flexWrap: "wrap",
    gap: "8px",
  },
  nightsLabel: { fontSize: "13px", color: "#9FB0C8" },
  btnRow: { display: "flex", gap: "8px" },
  btnClear: {
    padding: "9px 18px",
    border: "1px solid #1f2a37",
    borderRadius: "8px",
    background: "transparent",
    fontSize: "13px",
    fontWeight: 500,
    color: "#C7D2E6",
    cursor: "pointer",
  },
  btnApply: {
    padding: "9px 22px",
    border: "none",
    borderRadius: "8px",
    background: ACCENT,
    fontSize: "13px",
    fontWeight: 500,
    color: "#fff",
    cursor: "pointer",
  },
};

// ─── Day Cell ────────────────────────────────────────────────────────────────

function DayCell({ date, startDate, endDate, hovered, today, onSelect, onHover }) {
  if (!date) return <div style={{ height: "36px" }} />;

  const isPast = date < today;
  const dk = toKey(date);
  const sk = toKey(startDate);
  const ek = toKey(endDate);
  const hk = toKey(hovered);

  const isStart   = sk && dk === sk;
  const isEnd     = ek && dk === ek;
  const inRange   = sk && ek && dk > sk && dk < ek;
  const isToday   = sameDay(date, today);

  // Preview (hover) range when only start is picked
  const previewActive = sk && !ek && hk && hk > sk;
  const inPreview = previewActive && dk > sk && dk < hk;
  const isHovEnd  = previewActive && dk === hk;

  // Background strip for range
  const hasFinalRange = isStart && ek;
  const hasPreviewRange = isStart && !ek && previewActive;
  const isRangeStart = hasFinalRange || hasPreviewRange;
  const isRangeEnd = isEnd || isHovEnd;

  // Cell background (full cell, for in-range days)
  let cellBg = "transparent";
  if (inRange) cellBg = ACCENT_LIGHT;
  if (inPreview) cellBg = ACCENT_PREVIEW;

  // The inner circle/dot for start and end
  const circleStyle = (isStart || isEnd || isHovEnd)
    ? { background: ACCENT, color: "#fff", borderRadius: "50%" }
    : {};

  // Half-strip behind the circle (extends range fill into the circle cell)
  const stripStyle = (() => {
    if (isRangeStart) return {
      position: "absolute", top: 0, right: 0, bottom: 0, left: "50%",
      background: ACCENT_LIGHT, zIndex: 0,
    };
    if (isRangeEnd) return {
      position: "absolute", top: 0, right: "50%", bottom: 0, left: 0,
      background: inRange || inPreview ? ACCENT_LIGHT : (ek ? ACCENT_LIGHT : ACCENT_PREVIEW),
      zIndex: 0,
    };
    return null;
  })();

  const cellStyle = {
    position: "relative",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: cellBg,
    cursor: isPast ? "not-allowed" : "pointer",
  };

  const numStyle = {
    position: "relative",
    zIndex: 1,
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    fontSize: "13.5px",
    fontWeight: isToday ? 600 : 400,
    color: isPast
      ? "#3b4652"
      : (isStart || isEnd || isHovEnd)
        ? "#fff"
        : "#E6EEF8",
    ...circleStyle,
    transition: "background 0.1s",
  };

  return (
    <div
      style={cellStyle}
      onClick={() => !isPast && onSelect(date)}
      onMouseEnter={() => !isPast && onHover(date)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Range fill strip behind circle */}
      {stripStyle && <div style={stripStyle} />}

      <div style={numStyle}>
        {date.getDate()}
        {/* Today dot */}
        {isToday && !isStart && !isEnd && !isHovEnd && (
          <span style={{
            position: "absolute",
            bottom: "3px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: ACCENT,
          }} />
        )}
      </div>
    </div>
  );
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

function MonthGrid({ year, month, isLeft, onPrev, onNext, startDate, endDate, hovered, today, onSelect, onHover }) {
  const totalDays = daysInMonth(year, month);
  const firstDay  = firstDOW(year, month);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));

  return (
    <div>
      {/* Month navigation */}
      <div style={S.monthNav}>
        <button
          type={"button"}
          style={isLeft ? S.navBtn : { ...S.navBtn, ...S.navBtnHidden }}
          onClick={onPrev}
          aria-label="Previous month"
        >
          ‹
        </button>
        <span style={S.monthTitle}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          type={"button"}
          style={!isLeft ? S.navBtn : { ...S.navBtn, ...S.navBtnHidden }}
          onClick={onNext}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday headers */}
      <div style={S.dayHeaders}>
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} style={S.dayHeader}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={S.daysGrid}>
        {cells.map((date, i) => (
          <DayCell
            key={i}
            date={date}
            startDate={startDate}
            endDate={endDate}
            hovered={hovered}
            today={today}
            onSelect={onSelect}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * DateRangePicker
 *
 * Props:
 *   value        : { start: Date|null, end: Date|null }
 *   onChange     : (range: { start: Date|null, end: Date|null }) => void
 *   minDate      : Date (default: today)
 *   onClose      : () => void   (called after Apply or outside click)
 *
 * Usage:
 *   <DateRangePicker
 *     value={range}
 *     onChange={setRange}
 *     onClose={() => setPickerOpen(false)}
 *   />
 */
export function DateRangePicker({ value, onChange, minDate, onClose }) {
  const today = startOfDay(minDate ?? new Date());
  const [start, setStart] = useState(value?.start ?? null);
  const [end,   setEnd]   = useState(value?.end   ?? null);
  const [hovered, setHovered] = useState(null);
  const [baseYear, setBaseYear] = useState(today.getFullYear());
  const [baseMonth, setBaseMonth] = useState(today.getMonth());
  const [activeField, setActiveField] = useState("start"); // "start" | "end"

  const [showPanel, setShowPanel] = useState(false);

  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const { year: y2, month: m2 } = addMonths(baseYear, baseMonth, 1);

  function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  const handleSelect = useCallback((date) => {
    if (!start || (start && end) || date < start) {
      setStart(date);
      setEnd(null);
      setActiveField("end");
    } else {
      setEnd(date);
      setShowPanel(false)
      setActiveField(null);
      onChange?.({ start: formatDate(start), end: formatDate(date) });
      onClose?.();
    }
  }, [start, end]);

  const handlePrev = () => {
    const prev = addMonths(baseYear, baseMonth, -1);
    setBaseYear(prev.year);
    setBaseMonth(prev.month);
  };

  const handleNext = () => {
    const next = addMonths(baseYear, baseMonth, 1);
    setBaseYear(next.year);
    setBaseMonth(next.month);
  };

  const handleClear = () => {
    setStart(null);
    setEnd(null);
    setActiveField("start");
  };

  const handleApply = () => {
    onChange?.({ start, end });
    onClose?.();
  };

  const nights = nightsBetween(start, end);

  return (
    <div style={S.shell}>
      {/* ── Input bar ── */}
      <div style={S.inputRow} onClick={() => setShowPanel(!showPanel)}>
        <div
          style={S.field(activeField === "start")}
          onClick={() => setActiveField("start")}
        >
          <div style={S.fieldLabel}>Departure</div>
          <div style={S.fieldValue(!!start)}>
            {formatDisplay(start) ?? "Add date"}
          </div>
        </div>
        <div
          style={S.fieldLast(activeField === "end")}
          onClick={() => setActiveField("end")}
        >
          <div style={S.fieldLabel}>Return</div>
          <div style={S.fieldValue(!!end)}>
            {formatDisplay(end) ?? "Add date"}
          </div>
        </div>
      </div>

      {/* ── Calendar panel ── */}
      { showPanel &&
      <div style={S.panel} ref={panelRef}>
        <div style={S.monthsGrid}>
          <MonthGrid
            year={baseYear}
            month={baseMonth}
            isLeft
            onPrev={handlePrev}
            onNext={handleNext}
            startDate={start}
            endDate={end}
            hovered={hovered}
            today={today}
            onSelect={handleSelect}
            onHover={setHovered}
          />
          <MonthGrid
            year={y2}
            month={m2}
            isLeft={false}
            onPrev={handlePrev}
            onNext={handleNext}
            startDate={start}
            endDate={end}
            hovered={hovered}
            today={today}
            onSelect={handleSelect}
            onHover={setHovered}
          />
        </div>

        {/* ── Footer ── */}
        {/*<div style={S.footer}>*/}
        {/*  <span style={S.nightsLabel}>*/}
        {/*    {end*/}
        {/*      ? `${nights} night${nights !== 1 ? "s" : ""} selected`*/}
        {/*      : start*/}
        {/*        ? "Select departure date"*/}
        {/*        : "Select return date"}*/}
        {/*  </span>*/}
        {/*  <div style={S.btnRow}>*/}
        {/*    <button type={"button"} style={S.btnClear} onClick={handleClear}>*/}
        {/*      Clear*/}
        {/*    </button>*/}
        {/*    <button type={"button"} style={S.btnApply} onClick={handleApply} disabled={!start}>*/}
        {/*      Apply*/}
        {/*    </button>*/}
        {/*  </div>*/}
        {/*</div>*/}
      </div>}
    </div>
  );
}

// ─── Demo wrapper (default export for quick preview) ─────────────────────────
//
// export default function App() {
//   const [range, setRange] = useState({ start: null, end: null });
//   const [open, setOpen] = useState(true);
//
//   return (
//     <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "24px" }}>
//       <h2 style={{ textAlign: "center", fontFamily: "sans-serif", marginBottom: "8px", fontWeight: 600 }}>
//         Date Range Picker
//       </h2>
//       <p style={{ textAlign: "center", fontFamily: "sans-serif", color: "#888", marginBottom: "24px", fontSize: "14px" }}>
//         Airbnb / Wizzair style
//       </p>
//
//       {!open && (
//         <div style={{ textAlign: "center", marginBottom: "16px" }}>
//           <p style={{ fontFamily: "sans-serif", fontSize: "14px", color: "#444", marginBottom: "8px" }}>
//             {range.start && range.end
//               ? `${formatDisplay(range.start)} → ${formatDisplay(range.end)}`
//               : "No dates selected"}
//           </p>
//           <button
//             style={{ ...S.btnApply, padding: "10px 24px" }}
//             onClick={() => setOpen(true)}
//           >
//             Change dates
//           </button>
//         </div>
//       )}
//
//       {open && (
//         <DateRangePicker
//           value={range}
//           onChange={(r) => { setRange(r); }}
//           onClose={() => setOpen(false)}
//         />
//       )}
//     </div>
//   );
// }