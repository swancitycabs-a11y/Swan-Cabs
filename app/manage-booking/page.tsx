"use client";

import { useState, useEffect } from "react";
import BookingForm from "../components/BookingForm";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [view, setView] = useState<"track" | "edit" | null>(null);

  // 🚕 TRACKING STATES
  const [etaMinutes, setEtaMinutes] = useState<number | null>(12);
  const [carProgress, setCarProgress] = useState(0);

  // 🔍 SEARCH BOOKING
  async function searchBooking() {
    try {
      const res = await fetch("/api/get-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!data || !data.booking) {
        setMsg("❌ Booking not found");
        setBooking(null);
        setShowOptions(false);
        return;
      }

      setBooking(data.booking);
      setMsg("");
      setShowOptions(true);
      setView(null);
    } catch (err) {
      console.error(err);
      setMsg("❌ Something went wrong");
    }
  }

  // ❌ CANCEL BOOKING
  async function cancelBooking() {
    try {
      const res = await fetch("/api/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (data.ok) {
        setMsg("✅ Booking cancelled");
        await searchBooking();
      } else {
        setMsg("❌ Cancel failed");
      }
    } catch (err) {
      console.error(err);
      setMsg("❌ Cancel failed");
    }
  }

  const isCancelled =
    booking?.status?.toLowerCase?.() === "cancelled";

  // 🚕 ETA LOGIC (NOW vs LATER)
  useEffect(() => {
    if (!booking) return;

    if (booking.bookingWhen === "now") {
      setEtaMinutes(12);
      setCarProgress(0);
      return;
    }

    if (booking.bookingWhen === "later") {
      const pickupTime = new Date(`${booking.date}T${booking.time}`);
      const now = new Date();

      const diffMinutes =
        (pickupTime.getTime() - now.getTime()) / 60000;

      if (diffMinutes <= 15) {
        setEtaMinutes(15);
        setCarProgress(0);
      } else {
        setEtaMinutes(null);
      }
    }
  }, [booking]);

  // 🚕 COUNTDOWN + SMOOTH ANIMATION
  useEffect(() => {
    if (etaMinutes === null || etaMinutes <= 0) return;

    const interval = setInterval(() => {
      setEtaMinutes((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });

      setCarProgress((prev) => {
        const step = 100 / 12;
        return Math.min(100, prev + step);
      });
    }, 6000); // ⚡ change to 60000 for real time

    return () => clearInterval(interval);
  }, [etaMinutes]);

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      {/* 🎨 PREMIUM ANIMATIONS */}
      <style jsx>{`
        @keyframes roadMove {
          from { transform: translateX(0) translateY(-50%); }
          to { transform: translateX(-50%) translateY(-50%); }
        }

        @keyframes carBounce {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-3px); }
        }

        @keyframes pulse {
          0% { transform: translateY(-50%) scale(1); opacity: 1; }
          50% { transform: translateY(-50%) scale(1.2); opacity: 0.7; }
          100% { transform: translateY(-50%) scale(1); opacity: 1; }
        }
      `}</style>

      <h1>Manage Booking</h1>

      {/* SEARCH */}
      <input
        placeholder="Enter Booking ID"
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value.toUpperCase())}
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button
        onClick={searchBooking}
        style={{
          width: "100%",
          padding: 12,
          background: "#facc15",
          border: "none",
          borderRadius: 10,
          fontWeight: "bold",
        }}
      >
        Find Booking
      </button>

      {msg && (
        <p style={{ marginTop: 10, color: "red", fontWeight: "bold" }}>
          {msg}
        </p>
      )}

      {/* OPTIONS */}
      {showOptions && booking && (
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
  
  {/* 🚕 TRACK */}
  <button
    onClick={() => setView("track")}
    disabled={isCancelled}
    style={{
      flex: 1,
      padding: 12,
      background: isCancelled ? "#555" : "#3b82f6",
      color: "#fff",
      borderRadius: 10,
      cursor: isCancelled ? "not-allowed" : "pointer",
      opacity: isCancelled ? 0.6 : 1,
    }}
  >
    🚕 Track
  </button>

  {/* ✏️ UPDATE */}
  <button
    onClick={() => setView("edit")}
    disabled={isCancelled}
    style={{
      flex: 1,
      padding: 12,
      background: isCancelled ? "#555" : "#22c55e",
      color: "#fff",
      borderRadius: 10,
      cursor: isCancelled ? "not-allowed" : "pointer",
      opacity: isCancelled ? 0.6 : 1,
    }}
  >
    ✏️ Update
  </button>

  {/* ❌ CANCEL */}
  <button
    onClick={cancelBooking}
    disabled={isCancelled}
    style={{
      flex: 1,
      padding: 12,
      background: isCancelled ? "#555" : "#ef4444",
      color: "#fff",
      borderRadius: 10,
      cursor: isCancelled ? "not-allowed" : "pointer",
      opacity: isCancelled ? 0.6 : 1,
    }}
  >
    ❌ Cancel
  </button>

</div>
      )}

      {/* 🚕 TRACK VIEW */}
      {view === "track" && booking && !isCancelled && (
        <div style={{ marginTop: 30 }}>
          <h3>🚕 Taxi is on the way</h3>

          <p>📍 <b>Pickup:</b> {booking.pickup}</p>

          {etaMinutes === null ? (
            <p>🕒 Driver will be assigned 15 minutes before pickup</p>
          ) : (
            <h2>⏱ Arriving in {etaMinutes} minutes</h2>
          )}

          {/* 🚕 PREMIUM TRACK */}
          <div
            style={{
              position: "relative",
              height: 80,
              marginTop: 30,
              background: "#111827",
              borderRadius: 40,
              overflow: "hidden",
            }}
          >
            {/* ROAD */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: "200%",
                height: 4,
                background:
                  "repeating-linear-gradient(90deg, #555 0 20px, transparent 20px 40px)",
                transform: "translateY(-50%)",
                animation: "roadMove 1s linear infinite",
              }}
            />

            {/* START */}
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
              🟢
            </div>

            {/* DESTINATION */}
            <div
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                animation: "pulse 1.5s infinite",
              }}
            >
              📍
            </div>

            {/* TAXI */}
            <div
              style={{
                position: "absolute",
                left: `${carProgress}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 36,
                transition: "left 0.8s ease-in-out",
                animation: "carBounce 0.6s infinite",
              }}
            >
              🚕
            </div>
          </div>
        </div>
      )}

      {/* UPDATE VIEW */}
      {view === "edit" && booking && (
        <div style={{ marginTop: 30 }}>
          <BookingForm isEdit={true} initialData={booking} />
        </div>
      )}

      {/* STATUS */}
      {booking && (
        <div style={{ marginTop: 20 }}>
          <b>Status:</b>{" "}
          <span style={{ color: isCancelled ? "red" : "#22c55e" }}>
            {booking.status || "Booked"}
          </span>
        </div>
      )}
      {isCancelled && (
  <p style={{ color: "#f87171", marginTop: 10 }}>
    ❌ This booking has been cancelled. 
  </p>
)}
    </div>
  );
}
