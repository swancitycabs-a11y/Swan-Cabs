"use client";

import { useState } from "react";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    pickup: "",
    dropoff: "",
  });

  // 🔍 SEARCH
  async function searchBooking() {
    const res = await fetch("/api/get-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    if (!data?.booking) {
      setMsg("❌ Booking not found");
      setBooking(null);
      return;
    }

    setBooking(data.booking);
    setForm(data.booking);
    setEditing(false);
    setMsg("");
  }

  // ✏️ UPDATE
  async function updateBooking() {
    const res = await fetch("/api/update-booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bookingId,
        ...form,
      }),
    });

    const data = await res.json();

    if (data.ok) {
      setMsg("✅ Booking updated");
      setEditing(false);
      searchBooking();
    } else {
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

      <button onClick={searchBooking} style={{ width: "100%", padding: 10 }}>
        Find Booking
      </button>

      {msg && <p style={{ color: "red" }}>{msg}</p>}

      {booking && (
        <div style={{ marginTop: 20, background: "#111", color: "#fff", padding: 15 }}>
          <h3>Booking Details</h3>

          {editing ? (
            <>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input value={form.pickup} onChange={(e) => setForm({ ...form, pickup: e.target.value })} />
              <input value={form.dropoff} onChange={(e) => setForm({ ...form, dropoff: e.target.value })} />

              <button onClick={updateBooking}>💾 Save</button>
            </>
          ) : (
            <>
              <p><b>ID:</b> {booking.bookingId}</p>
              <p><b>Name:</b> {booking.name}</p>
              <p><b>Phone:</b> {booking.phone}</p>
              <p><b>Pickup:</b> {booking.pickup}</p>
              <p><b>Dropoff:</b> {booking.dropoff}</p>

              <button onClick={() => setEditing(true)}>✏️ Edit</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
