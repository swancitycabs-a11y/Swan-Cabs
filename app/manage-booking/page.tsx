"use client";

import { useState, useEffect } from "react";
import BookingForm from "../components/BookingForm";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [view, setView] = useState<"track" | "edit" | null>(null);

  // 🚗 TRACKING STATES
  const [etaMinutes, setEtaMinutes] = useState<number | null>(12);
  const [carProgress, setCarProgress] = useState(0);

  // 🔍 SEARCH BOOKING
  async function searchBooking() {
    try {
      const res = await fetch("/api/get-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        headers: {
          "Content-Type": "application/json",
        },
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

  // 🚗 ETA LOGIC (NOW vs LATER)
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

  // 🚗 COUNTDOWN + ANIMATION
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
    }, 1000); // ⚡ change to 60000 for real use

    return () => clearInterval(interval);
  }, [etaMinutes]);

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
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
          cursor: "pointer",
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
          <button
            onClick={() => setView("track")}
            style={{
              flex: 1,
              padding: 12,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 10,
            }}
          >
            🚗 Track
          </button>

          <button
            onClick={() => setView("edit")}
            style={{
              flex: 1,
              padding: 12,
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 10,
            }}
          >
            ✏️ Update
          </button>

          <button
            onClick={cancelBooking}
            disabled={isCancelled}
            style={{
              flex: 1,
              padding: 12,
              background: isCancelled ? "#555" : "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: 10,
            }}
          >
            ❌ Cancel
          </button>
        </div>
      )}

      {/* 🚗 TRACK VIEW */}
      {view === "track" && booking && (
        <div style={{ marginTop: 30 }}>
          <h3>🚗 Taxi is on the way</h3>

          <p>📍 <b>Pickup:</b> {booking.pickup}</p>

          {etaMinutes === null ? (
            <p>🕒 Driver will be assigned 15 minutes before pickup</p>
          ) : (
            <h2>⏱ Arriving in {etaMinutes} minutes</h2>
          )}

          {/* ANIMATION */}
          <div
            style={{
              position: "relative",
              height: 60,
              marginTop: 30,
              background: "#1f2937",
              borderRadius: 30,
            }}
          >
            {/* ROAD */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: "100%",
                height: 4,
                background: "#555",
                transform: "translateY(-50%)",
              }}
            />

            {/* CAR */}
            <div
              style={{
                position: "absolute",
                left: `${carProgress}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 28,
                transition: "left 1s linear",
              }}
            >
              🚗
            </div>

            {/* START */}
            <div
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              🟢
            </div>

            {/* DESTINATION */}
            <div
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              📍
            </div>
          </div>
        </div>
      )}

      {/* ✏️ UPDATE VIEW */}
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
    </div>
  );
}
