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


// ✅ STEP 4 (route calculation)
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

        const route = result.routes[0];
        const path = route.overview_path;

        setRoutePath(path);
        setCarPosition(path[0]);

        const leg = route?.legs?.[0];
        if (!leg || !leg.duration) return;

        const duration = leg.duration.value / 60;
        setEtaMinutes(Math.round(duration));
      }
    }
  );
}, [booking]);
  // ✅ STEP 6 — CAR MOVEMENT (ADD HERE 👇)
useEffect(() => {
  if (!routePath.length) return;

  const interval = setInterval(() => {
    setStepIndex((prev) => {
      const next = prev + 1;

      if (next < routePath.length) {
        setCarPosition(routePath[next]);

        setEtaMinutes((eta) =>
          eta ? Math.max(1, eta - 1) : eta
        );

        return next;
      } else {
        clearInterval(interval);
        return prev;
      }
    });
  }, 2000);

  return () => clearInterval(interval);
}, [routePath]);


// ✅ ADD YOUR NEW LOGIC EXACTLY HERE 👇
useEffect(() => {
  if (!booking) return;

  if (booking.bookingWhen === "now") {
    setEtaMinutes(12);
    return;
  }

  if (booking.bookingWhen === "later") {
    const pickupTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();

    const diffMinutes =
      (pickupTime.getTime() - now.getTime()) / 60000;

    if (diffMinutes <= 15) {
      setEtaMinutes(15);
    } else {
      setEtaMinutes(null);
    }
  }
}, [booking]);



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

  const route = result.routes[0];
  const path = route.overview_path;

  setRoutePath(path);
  setCarPosition(path[0]);

  const leg = route?.legs?.[0];

  if (!leg || !leg.duration) return;

  const duration = leg.duration.value / 60;

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
