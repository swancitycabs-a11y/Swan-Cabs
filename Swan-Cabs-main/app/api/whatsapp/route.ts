import { NextResponse } from "next/server";

// Format date/time in Perth timezone
function formatDateTime(date?: string, time?: string) {
  if (!date || !time) return "-";

  const [y, m, d] = date.split("-");
  const [h, min] = time.split(":").map(Number);

  // Force Perth timezone (+08:00)
  const perthDate = new Date(`${y}-${m}-${d}T${time}:00+08:00`);

  const weekday = perthDate.toLocaleDateString("en-AU", {
    weekday: "long",
    timeZone: "Australia/Perth",
  });

  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;

  return `${d}/${m}/${y} ${hour12}:${min
    .toString()
    .padStart(2, "0")} ${ampm} ${weekday}`;
}

export async function POST(req: Request) {
  try {
    const booking = await req.json();

    const apiKey = process.env.D360_API_KEY;
    const adminsEnv = process.env.ADMIN_WA_TO;

    if (!apiKey || !adminsEnv) {
      return NextResponse.json(
        { ok: false, error: "Missing environment variables" },
        { status: 500 }
      );
    }

    const admins = adminsEnv.split(",").map((n) => n.trim());

    // Booking time (server time)
    const bookingTime = new Date().toLocaleString("en-AU", {
      timeZone: "Australia/Perth",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // ASAP or later
    const asapOrLater =
      booking.bookingWhen === "now"
        ? "ASAP"
        : `Later - ${formatDateTime(booking.date, booking.time)}`;

    // Return
    const returnText =
      booking.returnTrip === "Yes"
        ? `Yes - ${formatDateTime(booking.returnDate, booking.returnTime)}`
        : "No";

    // Stops
    const stopsText =
      booking.stops && booking.stops.length > 0
        ? booking.stops.map((s: any) => s.address || s).join(" → ")
        : "-";

    // Fare
    const fare =
      booking.estimatedFare &&
      !isNaN(Number(booking.estimatedFare))
        ? `$ ${Number(booking.estimatedFare).toFixed(2)}`
        : "-";

    const message = `🚕 *NEW TAXI BOOKING RECEIVED*

👤 Name :- ${booking.name || "-"}
📞 Phone :- ${booking.phone || "-"}
📧 Email :- ${booking.email || "-"}

📍 Pickup :- ${booking.pickup || "-"}
🏁 Dropoff :- ${booking.dropoff || "-"}
🛑 Stops :- ${stopsText}

🚗 Car Type :- ${booking.carType || "-"}
👥 Passengers :- ${booking.passengers ?? "-"}
🎒 Hand Carry :- ${booking.handCarryBags ?? 0}
🧳 Check In :- ${booking.checkInBags ?? 0}

⏰ Booking Time :- ${bookingTime}
⌛ ASAP or Later :- ${asapOrLater}
🔁 Return :- ${returnText}
✈ Return Flight :- ${booking.returnFlightNumber || "-"}

💰 Fare :- ${fare}
⏱ :- ${booking.duration ? `(${booking.duration}) Minutes` : "-"}
📝 Notes :- ${booking.specialRequest || "-"}`;

    for (const admin of admins) {
      try {
        const res = await fetch("https://waba-v2.360dialog.io/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "D360-API-KEY": apiKey,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: admin,
            type: "text",
            text: {
              preview_url: false,
              body: message,
            },
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.error("WhatsApp send failed for", admin, data);
        } else {
          console.log("WhatsApp sent to", admin);
        }

      } catch (err) {
        console.error("WhatsApp fetch error for", admin, err);
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
