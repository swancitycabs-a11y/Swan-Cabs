"use client";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
} from "@react-google-maps/api";

import { useState, useEffect } from "react";
import BookingForm from "../components/BookingForm";

export default function ManageBooking() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [view, setView] = useState<"track" | "edit" | null>(null);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(12);
  const [carPosition, setCarPosition] = useState<any>(null);
  const [routePath, setRoutePath] = useState<any[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [directions, setDirections] = useState<any>(null);

const [mapCenter, setMapCenter] = useState({
  lat: -31.9523,
  lng: 115.8613,
});

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


// ✅ STEP 4 GOES EXACTLY HERE 👇
useEffect(() => {
  if (!booking || !window.google) return;

  const service = new window.google.maps.DirectionsService();

  service.route(
    {
      origin: booking.pickup,
      destination: booking.dropoff,
      travelMode: window.google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === "OK" && result) {
         setDirections(result);

        const path = result.routes[0].overview_path;
        setRoutePath(path);
        setCarPosition(path[0]);

        const duration =
          result.routes[0].legs[0].duration.value / 60;

        setEtaMinutes(Math.round(duration));
      }
    }
  );
}, [booking]);

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

      {view === "track" && booking && (
  <div style={{ marginTop: 20 }}>
  <h3>🚗 Driver is on the way...</h3>

  <p>📍 <b>Pickup:</b> {booking.pickup}</p>
  <p>🏁 <b>Dropoff:</b> {booking.dropoff}</p>

  <p>⏱ ETA: {etaMinutes} minutes</p>

  <div style={{ height: 300, borderRadius: 12, overflow: "hidden" }}>
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={mapCenter}
      zoom={13}
    >
      {directions && <DirectionsRenderer directions={directions} />}

      {carPosition && (
        <Marker
          position={carPosition}
          icon={{
            url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png",
            scaledSize: new window.google.maps.Size(40, 40),
          }}
        />
      )}
    </GoogleMap>
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
