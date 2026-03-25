"use client";

import { useState } from "react";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState("");

  // 🔍 SEARCH BOOKING
  async function searchBooking() {
    try {
      const res = await fetch("/api/get-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // ✅ important
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      console.log("API DATA:", data); // 🔍 debug

      // ✅ FIXED CONDITION
      if (!data || !data.booking) {
        setMsg("❌ Booking not found");
        setBooking(null);
        return;
      }

      setBooking(data.booking);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("❌ Something went wrong");
    }
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

      {booking && (
        <div
          style={{
            marginTop: 20,
            padding: 15,
            borderRadius: 10,
            background: "#111",
            color: "#fff",
          }}
        >
          <h3 style={{ marginBottom: 10 }}>Booking Details</h3>

          <p><b>ID:</b> {booking.bookingId}</p>
          <p><b>Name:</b> {booking.name}</p>
          <p><b>Phone:</b> {booking.phone}</p>
          <p><b>Pickup:</b> {booking.pickup}</p>
          <p><b>Dropoff:</b> {booking.dropoff}</p>
          <p><b>Car Type:</b> {booking.carType}</p>

          {/* Optional: only show if exists */}
          {booking.status && (
            <p><b>Status:</b> {booking.status}</p>
          )}
        </div>
      )}
    </div>
  );
}
