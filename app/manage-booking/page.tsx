"use client";

import { useState, useEffect } from "react";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [view, setView] = useState<"track" | null>(null);

  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [carProgress, setCarProgress] = useState(100);
  const [targetTime, setTargetTime] = useState<number | null>(null);

  const [liveStatus, setLiveStatus] = useState("searching");

  // 🔍 SEARCH
  async function searchBooking() {
    const res = await fetch("/api/get-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    if (!data?.booking) {
      setMsg("❌ Booking not found");
      return;
    }

    setBooking(data.booking);
    setShowOptions(true);
    setMsg("");
    setView(null);
  }

  // ❌ CANCEL
  async function cancelBooking() {
    const res = await fetch("/api/cancel-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    if (data.ok) {
      await searchBooking();
    }
  }

  const isCancelled =
    booking?.status?.toLowerCase?.() === "cancelled";

  // 🚕 SET TIMER
  useEffect(() => {
    if (!booking) return;

    let target: number | null = null;

    if (booking.bookingWhen === "now") {
      target = Date.now() + 12 * 60 * 1000;
    }

    if (booking.bookingWhen === "later") {
      const pickup = new Date(`${booking.date}T${booking.time}`).getTime();
      const diff = pickup - Date.now();

      if (diff <= 15 * 60 * 1000) {
        target = Date.now() + 15 * 60 * 1000;
      } else {
        setEtaMinutes(null);
        return;
      }
    }

    if (target !== null) {
      setTargetTime(target);
    }

    setCarProgress(100);
    setLiveStatus("searching");

    const timer = setTimeout(() => {
      setLiveStatus("assigned");
    }, 3000);

    return () => clearTimeout(timer);
  }, [booking]);

  // 🚕 REAL TIMER + STATUS FLOW
  useEffect(() => {
    if (!targetTime) return;

    const interval = setInterval(() => {
      const diff = targetTime - Date.now();

      if (diff <= 0) {
        setEtaMinutes(0);
        setCarProgress(0);
        setLiveStatus("arrived");
        clearInterval(interval);
        return;
      }

      const minutes = Math.ceil(diff / 60000);
      setEtaMinutes(minutes);

      setLiveStatus("arriving");

      const total = 12 * 60 * 1000;
      const done = total - diff;

      const progress = 100 - (done / total) * 100;
      setCarProgress(Math.max(0, progress));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      <h1>Manage Booking</h1>

      <input
        placeholder="Enter Booking ID"
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value.toUpperCase())}
        style={{ width: "100%", padding: 10 }}
      />

      <button
        onClick={searchBooking}
        style={{
          width: "100%",
          padding: 12,
          background: "#facc15",
          marginTop: 10,
          borderRadius: 10,
        }}
      >
        Find Booking
      </button>

      {/* BUTTONS */}
      {showOptions && booking && (
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setView("track")}
            disabled={isCancelled}
            style={{
              flex: 1,
              padding: 12,
              background: isCancelled ? "#555" : "#3b82f6",
              color: "#fff",
              borderRadius: 10,
            }}
          >
            🚕 Track
          </button>

          <button
            onClick={cancelBooking}
            disabled={isCancelled}
            style={{
              flex: 1,
              padding: 12,
              background: isCancelled ? "#555" : "#ef4444",
              color: "#fff",
              borderRadius: 10,
            }}
          >
            ❌ Cancel
          </button>
        </div>
      )}

      {/* 🚕 TRACK VIEW */}
      {view === "track" && booking && !isCancelled && (
        <div style={{ marginTop: 30 }}>

          {/* 🚀 UBER STATUS */}
          <div style={{ marginBottom: 15 }}>
            {liveStatus === "searching" && <h3>🔍 Searching driver...</h3>}
            {liveStatus === "assigned" && <h3>👨‍✈️ Driver assigned</h3>}
            {liveStatus === "arriving" && etaMinutes !== null && etaMinutes > 0 && (
              <h2>🚕 Arriving in {etaMinutes} min</h2>
            )}
            {liveStatus === "arrived" && (
              <h2 style={{ color: "#22c55e" }}>✅ Driver has arrived</h2>
            )}
          </div>

          {/* STATUS BAR */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#22c55e" }}>Searching</span>
            <span style={{ color: ["assigned","arriving","arrived"].includes(liveStatus) ? "#22c55e" : "#fff" }}>Assigned</span>
            <span style={{ color: ["arriving","arrived"].includes(liveStatus) ? "#22c55e" : "#fff" }}>Arriving</span>
            <span style={{ color: liveStatus === "arrived" ? "#22c55e" : "#fff" }}>Arrived</span>
          </div>

          {/* DETAILS */}
          <div style={{ marginTop: 15 }}>
            <p>👤 {booking.name}</p>
            <p>📞 {booking.phone}</p>
            <p>📍 {booking.pickup}</p>
            <p>🏁 {booking.dropoff}</p>
          </div>

          {/* 🚕 MOVING TRACK */}
          <div
            style={{
              position: "relative",
              height: 70,
              marginTop: 20,
              background: "#111827",
              borderRadius: 40,
              overflow: "hidden",
            }}
          >
            {/* ROAD */}
            <div
              style={{
                position: "absolute",
                width: "200%",
                height: 4,
                top: "50%",
                background:
                  "repeating-linear-gradient(90deg, #555 0 20px, transparent 20px 40px)",
                animation: "moveRoad 1s linear infinite",
              }}
            />

            {/* START */}
            <div style={{ position: "absolute", left: 10, top: 20 }}>📍</div>

            {/* END */}
            <div style={{ position: "absolute", right: 10, top: 20 }}>🟢</div>

            {/* TAXI */}
            <div
              style={{
                position: "absolute",
                left: `${carProgress}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 36,
                transition: "left 1s linear",
              }}
            >
              🚕💨
            </div>
          </div>
        </div>
      )}

      {/* ❌ CANCEL STATUS */}
      {isCancelled && (
        <h1 style={{ color: "red", marginTop: 30, textAlign: "center" }}>
          ❌ BOOKING CANCELLED
        </h1>
      )}

      {/* DETAILS */}
      {booking && (
        <div style={{ marginTop: 20 }}>
          <p><b>Status:</b> {booking.status}</p>
        </div>
      )}

      {/* ANIMATION */}
      <style jsx>{`
        @keyframes moveRoad {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
