"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

  function ManageBookingPage() {
  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [view, setView] = useState<"track" | null>(null);
  const searchParams = useSearchParams();

  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [carProgress, setCarProgress] = useState(100);
  const [targetTime, setTargetTime] = useState<number | null>(null);

  const [liveStatus, setLiveStatus] = useState("searching");

  // 🔍 SEARCH
  async function searchBooking() {
    const res = await fetch("/api/get-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    if (!data?.booking) return;

    setBooking(data.booking);
    setShowOptions(true);
    setView(null);
  }

  // ✅ NEW: AUTO SEARCH FROM LINK
  async function searchBookingWithId(id: string) {
    try {
      const res = await fetch("/api/get-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId: id }),
      });

      const data = await res.json();

      if (data?.booking) {
        setBooking(data.booking);
        setShowOptions(true);
        setView("track"); // auto open tracking
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ❌ CANCEL (INSTANT UI UPDATE)
  async function cancelBooking() {
    await fetch("/api/cancel-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });

    setBooking((prev: any) => ({
      ...prev,
      status: "Cancelled",
    }));
  }

  const isCancelled =
    booking?.status?.toLowerCase?.() === "cancelled";

  // 🚕 SET TIMER
  useEffect(() => {
    if (!booking || isCancelled) return;

    let target: number | null = null;

    if (booking.bookingWhen === "now") {
      target = Date.now() + 12 * 60 * 1000;
    }

    if (target !== null) {
      setTargetTime(target);
    }

    setCarProgress(100);
    setLiveStatus("assigned");
  }, [booking]);

  // 🚕 REAL TIMER
  useEffect(() => {
    if (!targetTime || isCancelled) return;

    const interval = setInterval(() => {
      const diff = targetTime - Date.now();

      if (diff <= 0) {
        setEtaMinutes(0);
        setCarProgress(0);
        setLiveStatus("arrived");
        clearInterval(interval);
        return;
      }

      const minutes = Math.ceil(diff / 60000);
      setEtaMinutes(minutes);

      setLiveStatus("arriving");

      const total = 12 * 60 * 1000;
      const done = total - diff;

      const progress = 100 - (done / total) * 100;
      setCarProgress(Math.max(0, progress));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  // ✅ NEW: AUTO LOAD FROM URL
  useEffect(() => {
    const id = searchParams.get("bookingId");

    if (id) {
      setBookingId(id);

      setTimeout(() => {
        searchBookingWithId(id);
      }, 300);
    }
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      <h1>Manage Booking</h1>

      <input
        placeholder="Enter Booking ID"
        value={bookingId}
        onChange={(e) => setBookingId(e.target.value.toUpperCase())}
        style={{ width: "100%", padding: 10 }}
      />

      <button
        onClick={searchBooking}
        style={{
          width: "100%",
          padding: 12,
          background: "#facc15",
          marginTop: 10,
          borderRadius: 10,
        }}
      >
        Find Booking
      </button>

      {/* BUTTONS */}
      {showOptions && booking && (
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={() => setView("track")}
            disabled={isCancelled}
            style={{
              flex: 1,
              padding: 12,
              background: isCancelled ? "#555" : "#3b82f6",
              color: "#fff",
              borderRadius: 10,
            }}
          >
            🚕 Track
          </button>

          <button
            onClick={cancelBooking}
            disabled={isCancelled}
            style={{
              flex: 1,
              padding: 12,
              background: isCancelled ? "#555" : "#ef4444",
              color: "#fff",
              borderRadius: 10,
            }}
          >
            ❌ Cancel
          </button>
        </div>
      )}

      {/* 🚕 TRACK */}
      {view === "track" && booking && !isCancelled && (
        <div style={{ marginTop: 30 }}>
          <h2>🚕 Taxi is on the way to pickup</h2>

          <h2>
            {etaMinutes === 0
              ? "✅ Driver arrived"
              : `⏱ Arriving in ${etaMinutes} minutes`}
          </h2>

          <div
            style={{
              position: "relative",
              height: 70,
              marginTop: 20,
              background: "#111827",
              borderRadius: 40,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "200%",
                height: 4,
                top: "50%",
                background:
                  "repeating-linear-gradient(90deg, #555 0 20px, transparent 20px 40px)",
                animation: "moveRoad 1s linear infinite",
              }}
            />

            <div style={{ position: "absolute", left: 10, top: 20 }}>📍</div>
            <div style={{ position: "absolute", right: 10, top: 20 }}>🟢</div>

            <div
              style={{
                position: "absolute",
                left: `${carProgress}%`,
                top: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: 36,
                transition: "left 1s linear",
              }}
            >
              🚕💨
            </div>
          </div>
        </div>
      )}

      {/* ❌ CANCEL */}
      {isCancelled && (
        <h1 style={{ color: "red", marginTop: 30, textAlign: "center" }}>
          ❌ BOOKING CANCELLED
        </h1>
      )}

      {/* 📋 DETAILS */}
      {booking && (
        <div style={{ marginTop: 20, background: "#111827", padding: 15, borderRadius: 10 }}>
          <p><b>Status:</b> {booking.status}</p>
          <p>👤 {booking.name}</p>
          <p>📞 {booking.phone}</p>
          <p>📍 {booking.pickup}</p>
          <p>🏁 {booking.dropoff}</p>
          <p>📅 {booking.date}</p>
          <p>📆 {booking.pickupDay}</p>
          <p>⏰ {booking.time}</p>
        </div>
      )}

      <style jsx>{`
        @keyframes moveRoad {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
    export default function Page() {
  return (
    <Suspense fallback={<div>Loading booking...</div>}>
      <ManageBookingPage />
    </Suspense>
  );
}
  
