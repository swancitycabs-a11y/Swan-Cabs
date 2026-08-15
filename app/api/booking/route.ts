import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PERTH_TZ = "Australia/Perth";
const PERTH_OFFSET_MIN = 8 * 60;
const MAX_BODY_BYTES = 32_768;

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
  return `${get("day")}-${get("month")}-${get("year")} ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
}

function getPerthDayNameFromISO(iso: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone: PERTH_TZ, weekday: "long" }).format(new Date(iso));
}

function perthLocalToUtcISO(dateStr: string, timeStr: string) {
  const [yy, mm, dd] = dateStr.split("-").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);
  if (!yy || !mm || !dd || Number.isNaN(hh) || Number.isNaN(mi)) return new Date().toISOString();
  return new Date(Date.UTC(yy, mm - 1, dd, hh, mi, 0) - PERTH_OFFSET_MIN * 60_000).toISOString();
}

function buildPickupDateTimeISO(body: any) {
  const bookingWhen = String(body?.bookingWhen || "now");
  const date = String(body?.date || "");
  const time = String(body?.time || "");
  if (bookingWhen === "later" && date && time && date !== "now" && time !== "now") return perthLocalToUtcISO(date, time);
  return new Date().toISOString();
}

function buildReturnDateTimeISO(body: any) {
  const returnTrip = String(body?.returnTrip || "No");
  const rd = String(body?.returnDate || "");
  const rt = String(body?.returnTime || "");
  if (returnTrip === "Yes" && rd && rt) return perthLocalToUtcISO(rd, rt);
  return "";
}

function extractStops(body: any) {
  const raw = Array.isArray(body?.stops) ? body.stops : [];
  const stops = raw.slice(0, 2).map((s: any) => ({
    address: String(s?.address || "").trim().slice(0, 500),
    placeId: String(s?.placeId || "").trim().slice(0, 300),
  })).filter((s: any) => s.address || s.placeId);
  const hasStops = stops.length > 0;
  const stopsList = hasStops ? stops.map((s: any, i: number) => `Stop ${i + 1}: ${s.address || s.placeId}`).join(" | ") : "";
  const stopsText = hasStops ? stops.map((s: any, i: number) => `Stop ${i + 1}: ${s.address || s.placeId}`).join("\n") : "";
  return { stops, hasStops, stopsList, stopsText };
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function generateBookingId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "SC-";
  for (let i = 0; i < 6; i++) result += chars[randomInt(chars.length)];
  return result;
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const bookingId = generateBookingId();
    const pickup = cleanText(body.pickup, 500);
    const dropoff = cleanText(body.dropoff, 500);
    const name = cleanText(body.name, 100);
    const phone = cleanText(body.phone, 30);
    const email = cleanText(body.email, 254);

    if (!pickup || !dropoff || !name || !phone || !email) {
      return NextResponse.json({ ok: false, error: "Missing required fields (pickup, dropoff, name, phone, email)" }, { status: 400 });
    }
    if (!/^\+?[0-9 ()-]{7,30}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid phone or email" }, { status: 400 });
    }

    const MINIMUM_FARE = 22.5;
    const estimatedFare = Number(body?.estimatedFare || 0);
    const safeFare = Number.isFinite(estimatedFare) ? Math.max(MINIMUM_FARE, estimatedFare) : MINIMUM_FARE;
    const { stops, hasStops, stopsList, stopsText } = extractStops(body);
    const pickupDateTimeISO = buildPickupDateTimeISO(body);
    const createdAtISO = new Date().toISOString();
    const createdAtPerth = toPerthLabelFromISO(createdAtISO);
    const pickupDateTimePerth = toPerthLabelFromISO(pickupDateTimeISO);
    const pickupDay = getPerthDayNameFromISO(pickupDateTimeISO);
    const asapOrLater = String(body?.bookingWhen) === "later" ? `Later - ${pickupDateTimePerth}` : "ASAP";
    const returnTrip = String(body?.returnTrip || "No");
    const returnDateTimeISO = buildReturnDateTimeISO(body);
    const returnDateTimePerth = returnTrip === "Yes" && returnDateTimeISO ? toPerthLabelFromISO(returnDateTimeISO) : "";
    const returnTripLabel = returnTrip === "Yes" ? `Yes - ${returnDateTimePerth}` : "No";

    const payload = {
      ...body,
      pickup,
      dropoff,
      name,
      phone,
      email,
      bookingId,
      estimatedFare: safeFare,
      pickupDay,
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
      pickupDate: body?.bookingWhen === "later" ? cleanText(body?.date, 10) : "",
      pickupTime: body?.bookingWhen === "later" ? cleanText(body?.time, 5) : "",
    };

    const makeUrl = process.env.MAKE_WEBHOOK_URL || "";
    if (!makeUrl) return NextResponse.json({ ok: false, error: "Booking service unavailable" }, { status: 500 });

    const r = await fetch(makeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!r.ok) {
      console.error("Make webhook failed", { status: r.status, bookingId });
      return NextResponse.json({ ok: false, error: "Booking service temporarily unavailable" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, bookingId });
  } catch (e: any) {
    console.error("Booking API error", e);
    return NextResponse.json({ ok: false, error: "Unable to process booking" }, { status: 500 });
  }
}
