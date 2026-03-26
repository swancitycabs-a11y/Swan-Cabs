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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      console.log("API DATA:", data);

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
        setBooking(null);
      }
    } catch (err) {
      console.error(err);
      setMsg("❌ Cancel failed");
    }
  }

  // ✏️ UPDATE BOOKING
  async function updateBooking() {
    try {
      const res = await fetch("/api/update-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(booking),
      });

      const data = await res.json();

      if (data.ok) {
        setMsg("✅ Booking updated");
      }
    } catch (err) {
      console.error(err);
      setMsg("❌ Update failed");
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "auto" }}>
      <h1>Manage Booking</h1>

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

          {/* ✏️ Editable fields */}
          <p><b>ID:</b> {booking.bookingId}</p>

          <p>
            <b>Name:</b>
            <input
              value={booking.name}
              onChange={(e) =>
                setBooking({ ...booking, name: e.target.value })
              }
              style={{ width: "100%", marginTop: 5 }}
            />
          </p>

          <p>
            <b>Phone:</b>
            <input
              value={booking.phone}
              onChange={(e) =>
                setBooking({ ...booking, phone: e.target.value })
              }
              style={{ width: "100%", marginTop: 5 }}
            />
          </p>

          <p>
            <b>Pickup:</b>
            <input
              value={booking.pickup}
              onChange={(e) =>
                setBooking({ ...booking, pickup: e.target.value })
              }
              style={{ width: "100%", marginTop: 5 }}
            />
          </p>

          <p>
            <b>Dropoff:</b>
            <input
              value={booking.dropoff}
              onChange={(e) =>
                setBooking({ ...booking, dropoff: e.target.value })
              }
              style={{ width: "100%", marginTop: 5 }}
            />
          </p>

          <p>
            <b>Car Type:</b>
            <input
              value={booking.carType}
              onChange={(e) =>
                setBooking({ ...booking, carType: e.target.value })
              }
              style={{ width: "100%", marginTop: 5 }}
            />
          </p>

          {booking.status && (
            <p><b>Status:</b> {booking.status}</p>
          )}

          {/* 🔥 ACTION BUTTONS */}
          <div style={{ marginTop: 15 }}>
            <button
              onClick={updateBooking}
              style={{
                padding: 10,
                background: "#22c55e",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✏️ Update
            </button>

            <button
              onClick={cancelBooking}
              style={{
                padding: 10,
                marginLeft: 10,
                background: "#ef4444",
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
