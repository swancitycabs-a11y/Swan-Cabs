"use client";

import { useState } from "react";
import BookingForm from "../components/BookingForm";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [view, setView] = useState<"track" | "edit" | null>(null);

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

      console.log("API DATA:", data);

      if (!data || !data.booking) {
        setMsg("❌ Booking not found");
        setBooking(null);
        setShowOptions(false);
        return;
      }

      setBooking(data.booking);
      setMsg("");
      setShowOptions(true); // ✅ SHOW BUTTONS
      setView(null); // reset view
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
        await searchBooking(); // refresh
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

      {/* ✅ OPTIONS BUTTONS */}
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
              fontWeight: "bold",
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
              fontWeight: "bold",
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
              fontWeight: "bold",
              cursor: isCancelled ? "not-allowed" : "pointer",
            }}
          >
            ❌ Cancel
          </button>
        </div>
      )}

      {/* 🚗 TRACK VIEW */}
      {view === "track" && booking && (
        <div style={{ marginTop: 30 }}>
          <h3>🚗 Driver is on the way...</h3>
          <p>Estimated arrival: 12 minutes</p>
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
