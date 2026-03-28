"use client";

import { useState } from "react";
import BookingForm from "../components/BookingForm"; // ✅ NEW

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

      {/* ✅ NEW: FULL BOOKING FORM */}
      {booking && (
        <>
          <div style={{ marginTop: 30 }}>
            <BookingForm isEdit={true} initialData={booking} />
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button
              onClick={cancelBooking}
              disabled={isCancelled}
              style={{
                padding: "12px 20px",
                background: isCancelled ? "#555" : "#ef4444",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontWeight: "bold",
                cursor: isCancelled ? "not-allowed" : "pointer",
              }}
            >
              ❌ Cancel Booking
            </button>

            {booking.status && (
              <div style={{ marginTop: 10 }}>
                <b>Status:</b>{" "}
                <span style={{ color: isCancelled ? "red" : "#22c55e" }}>
                  {booking.status}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
