import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PERTH_TZ = "Australia/Perth";
const PERTH_OFFSET_MIN = 8 * 60; // UTC+8

function toPerthLabelFromISO(iso: string) {
  const d = new Date(iso);

  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: PERTH_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);

  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get(
    "minute"
  )} ${get("dayPeriod").toUpperCase()}`;
}

function getPerthDayNameFromISO(iso: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: PERTH_TZ,
    weekday: "long",
  }).format(new Date(iso));
}


function perthLocalToUtcISO(dateStr: string, timeStr: string) {
  const [yy, mm, dd] = dateStr.split("-").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);

  if (!yy || !mm || !dd || Number.isNaN(hh) || Number.isNaN(mi)) {
    return new Date().toISOString();
  }

  const utcMillis =
    Date.UTC(yy, mm - 1, dd, hh, mi, 0) - PERTH_OFFSET_MIN * 60_000;

  return new Date(utcMillis).toISOString();
}

function buildPickupDateTimeISO(body: any) {
  const bookingWhen = String(body?.bookingWhen || "now");
  const date = String(body?.date || "");
  const time = String(body?.time || "");

  if (
    bookingWhen === "later" &&
    date &&
    time &&
    date !== "now" &&
    time !== "now"
  ) {
    return perthLocalToUtcISO(date, time);
  }
  return new Date().toISOString();
}

function buildReturnDateTimeISO(body: any) {
  const returnTrip = String(body?.returnTrip || "No");
  const rd = String(body?.returnDate || "");
  const rt = String(body?.returnTime || "");

  if (returnTrip === "Yes" && rd && rt) {
    return perthLocalToUtcISO(rd, rt);
  }
  return "";
}

// ✅ NEW: stops helper (max 2)
function extractStops(body: any) {
  const raw = Array.isArray(body?.stops) ? body.stops : [];
  const stops = raw
    .slice(0, 2)
    .map((s: any) => ({
      address: String(s?.address || "").trim(),
      placeId: String(s?.placeId || "").trim(),
    }))
    .filter((s: any) => s.address || s.placeId);

  const hasStops = stops.length > 0;

  // Nice single-line (easy for Make)
  const stopsList = hasStops
    ? stops
        .map((s: any, i: number) => `Stop ${i + 1}: ${s.address || s.placeId}`)
        .join(" | ")
    : "";

  // Nice multi-line (good for emails)
  const stopsText = hasStops
    ? stops
        .map((s: any, i: number) => `Stop ${i + 1}: ${s.address || s.placeId}`)
        .join("\n")
    : "";

  return { stops, hasStops, stopsList, stopsText };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const pickup = String(body?.pickup || "");
    const dropoff = String(body?.dropoff || "");
    const name = String(body?.name || "");
    const phone = String(body?.phone || "");
    const email = String(body?.email || "");

    if (!pickup || !dropoff || !name || !phone || !email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required fields (pickup, dropoff, name, phone, email)",
        },
        { status: 400 }
      );
    }

    // ⭐ ADDED — HARD MINIMUM FARE LOCK
    const MINIMUM_FARE = 22.5;
    const estimatedFare = Number(body?.estimatedFare || 0);

    const safeFare = Math.max(MINIMUM_FARE, estimatedFare);

    if (estimatedFare < MINIMUM_FARE) {
      console.log(
        "⚠️ Minimum fare corrected:",
        estimatedFare,
        "→",
        safeFare
      );
    }

    // ✅ NEW: stops fields
    const { stops, hasStops, stopsList, stopsText } = extractStops(body);

    const pickupDateTimeISO = buildPickupDateTimeISO(body);
    const createdAtISO = body?.createdAt || new Date().toISOString();

    const createdAtPerth = toPerthLabelFromISO(createdAtISO);
    const pickupDateTimePerth = toPerthLabelFromISO(pickupDateTimeISO);
    const pickupDay = getPerthDayNameFromISO(pickupDateTimeISO);

    const asapOrLater =
      String(body?.bookingWhen) === "later"
        ? `Later - ${pickupDateTimePerth}`
        : "ASAP";

    const returnTrip = String(body?.returnTrip || "No");
    const returnDateTimeISO = buildReturnDateTimeISO(body);

    const returnDateTimePerth =
      returnTrip === "Yes" && returnDateTimeISO
        ? toPerthLabelFromISO(returnDateTimeISO)
        : "";

    const returnTripLabel =
      returnTrip === "Yes" ? `Yes - ${returnDateTimePerth}` : "No";

    // ⭐ UPDATED PAYLOAD — USE safeFare INSTEAD
    const payload = {
      ...body,

      estimatedFare: safeFare, // ⭐ SERVER PROTECTED PRICE

      pickupDay: pickupDay,

      stops,
      hasStops,
      stopsList,
      stopsText,

      pickupDateTimeISO,
      createdAt: createdAtISO,

      createdAtPerth,
      pickupDateTimePerth,
      asapOrLater,
      returnTripLabel,

      pickupDate: body?.bookingWhen === "later" ? body?.date || "" : "",
      pickupTime: body?.bookingWhen === "later" ? body?.time || "" : "",
    };

    const makeUrl = process.env.MAKE_WEBHOOK_URL || "";
    if (!makeUrl) {
      return NextResponse.json(
        { ok: false, error: "MAKE_WEBHOOK_URL missing in Vercel env" },
        { status: 500 }
      );
    }

    const r = await fetch(makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await r.text().catch(() => "");
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: `Make webhook failed: HTTP ${r.status} ${text}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
