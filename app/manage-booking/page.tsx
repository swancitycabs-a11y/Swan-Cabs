"use client";

import { useState } from "react";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState(null);
  const [msg, setMsg] = useState("");

  // 🔍 SEARCH BOOKING
  async function searchBooking() {
    const res = await fetch("/api/get-booking", {
      method: "POST",
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    if (!data.booking || !data.booking.bookingId) {
      setMsg("❌ Booking not found");
      setBooking(null);
      return;
    }

    setBooking(data.booking);
    setMsg("");
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h1>Manage Booking</h1>

      <input
        placeholder="Enter Booking ID"
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value.toUpperCase())}
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 10,
        }}
      />

      <button
        onClick={searchBooking}
        style={{
          width: "100%",
          padding: 10,
          background: "#facc15",
          border: "none",
          borderRadius: 8,
          fontWeight: "bold",
        }}
      >
        Find Booking
      </button>

      {msg && <p style={{ marginTop: 10 }}>{msg}</p>}

      {booking && (
        <div style={{ marginTop: 20 }}>
          <h3>Booking Details</h3>

          <p><b>ID:</b> {booking.bookingId}</p>
          <p><b>Name:</b> {booking.name}</p>
          <p><b>Pickup:</b> {booking.pickup}</p>
          <p><b>Dropoff:</b> {booking.dropoff}</p>
          <p><b>Status:</b> {booking.status}</p>
        </div>
      )}
    </div>
  );
}
