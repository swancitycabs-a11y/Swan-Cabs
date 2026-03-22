import { NextResponse } from "next/server";

export const runtime = "nodejs"; // required for server-side fetch + stable env

const GOOGLE_TZ = "Australia/Perth";

// --- Tariff table (Unbooked Service Fares as at 3 May 2024)
const TARIFF = {
  day: { flagfall: 5.4, perKm: 2.13, perHour: 61.0 }, // Mon–Fri 6am–6pm
  night: { flagfall: 7.7, perKm: 2.13, perHour: 61.0 }, // night/weekend/public holiday
  fivePlus: { flagfall: 7.7, perKm: 3.19, perHour: 95.0 }, // 5+ passengers
};

const EXTRAS = {
  bookingFee: 1.9,
  airportFee: 4.5,
  ultraPeak: 4.5, // approx
  christmasDay: 6.4,
  newYears: 7.4, // 6pm NYE to 6am NYD
  babySeat: 15, // ✅ ADD THIS
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function isAirportPickup(text: string) {
  return (text || "").toLowerCase().includes("airport");
}

function getPerthParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: GOOGLE_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  return {
    weekday: get("weekday"), // Mon, Tue...
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function weekdayToIndex(w: string) {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? -1;
}

function isDayTariff(perth: ReturnType<typeof getPerthParts>) {
  const dayIndex = weekdayToIndex(perth.weekday);
  const isMonToFri = dayIndex >= 1 && dayIndex <= 5;
  const is6to18 = perth.hour >= 6 && perth.hour < 18;
  return isMonToFri && is6to18;
}

function isUltraPeak(perth: ReturnType<typeof getPerthParts>) {
  const dayIndex = weekdayToIndex(perth.weekday);
  if (dayIndex === 5) return true; // Fri
  if (dayIndex === 6) return true; // Sat
  if (dayIndex === 0 && perth.hour < 3) return true; // Sun early
  return false;
}

function isChristmasDay(perth: ReturnType<typeof getPerthParts>) {
  return perth.month === 12 && perth.day === 25;
}

function isNewYearsSurcharge(perth: ReturnType<typeof getPerthParts>) {
  if (perth.month === 12 && perth.day === 31 && perth.hour >= 18) return true;
  if (perth.month === 1 && perth.day === 1 && perth.hour < 6) return true;
  return false;
}

type FareBreakdown = {
  tariffLabel: string;
  flagfall: number;
  distancePart: number;
  timePart: number;
  variablePart: number;
  bookingFee: number;
  airportFee: number;
  ultraPeak: number;
  christmas: number;
  newYears: number;
  babySeat: number; // ✅ ADD
  total: number;
};


function calcFare(params: {
  carType: string;
  passengers: number;
  distanceKm: number;
  durationMin: number;
  tripDate: Date;
  pickupText: string;
  serverStartAddress?: string;
}): FareBreakdown {
  const {
    carType,
    passengers,
    distanceKm,
    durationMin,
    tripDate,
    pickupText,
    serverStartAddress,
  

  } = params;

  const perth = getPerthParts(tripDate);

  const fivePlusApplies =
    passengers >= 5 ||
    carType === "Wagon 4 Pax + Luggage" ||
    carType === "Maxi Taxi 7 Pax" ||
    carType === "Baby Seat Maxi Taxi 7 Pax" ||
    carType === "Maxi Taxi 10 Pax + Wheelchair";

  const tariff = fivePlusApplies
    ? TARIFF.fivePlus
    : isDayTariff(perth)
    ? TARIFF.day
    : TARIFF.night;

  const tariffLabel = fivePlusApplies
    ? "5+ passengers tariff"
    : isDayTariff(perth)
    ? "Day tariff"
    : "Night/Weekend tariff";

  const flagfall = tariff.flagfall;
  const distancePart = distanceKm > 0 ? distanceKm * tariff.perKm : 0;

  const timeHours = durationMin > 0 ? durationMin / 60 : 0;
  const timePart = timeHours > 0 ? timeHours * tariff.perHour : 0;

  const variablePart = Math.max(distancePart, timePart);

  const bookingFee = EXTRAS.bookingFee;

  const pickupLooksAirport =
    isAirportPickup(pickupText) || isAirportPickup(serverStartAddress || "");
  const airportFee = pickupLooksAirport ? EXTRAS.airportFee : 0;

  const ultraPeak = isUltraPeak(perth) ? EXTRAS.ultraPeak : 0;
  const christmas = isChristmasDay(perth) ? EXTRAS.christmasDay : 0;
  const newYears = isNewYearsSurcharge(perth) ? EXTRAS.newYears : 0;

  const babySeatFee =
  carType === "Baby Seat Sedan" ||
  carType === "Baby Seat Maxi Taxi 7 Pax"
    ? EXTRAS.babySeat
    : 0;
   const total =
    flagfall +
    variablePart +
    bookingFee +
    airportFee +
    ultraPeak +
    christmas +
    babySeatFee +
    newYears;

  return {
  tariffLabel,
  flagfall: round2(flagfall),
  distancePart: round2(distancePart),
  timePart: round2(timePart),
  variablePart: round2(variablePart),
  bookingFee: round2(bookingFee),
  airportFee: round2(airportFee),
  ultraPeak: round2(ultraPeak),
  christmas: round2(christmas),
  newYears: round2(newYears),
  babySeat: round2(babySeatFee), // ✅ ADD
  total: round2(total),
};

}

async function fetchServerRoute(params: {
  serverKey: string;
  pickupPlaceId: string;
  dropoffPlaceId: string;
  stopPlaceIds?: string[]; // ✅ NEW
}) {
  const { serverKey, pickupPlaceId, dropoffPlaceId, stopPlaceIds = [] } = params;

  // ✅ keep only valid stops, max 2
  const validStops = stopPlaceIds.filter(Boolean).slice(0, 2);

  // ✅ waypoints in Google Directions API (place_id:)
  const waypointsParam =
    validStops.length > 0
      ? `&waypoints=${encodeURIComponent(
          validStops.map((id) => `place_id:${id}`).join("|")
        )}`
      : "";

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=place_id:${encodeURIComponent(pickupPlaceId)}` +
    `&destination=place_id:${encodeURIComponent(dropoffPlaceId)}` +
    `${waypointsParam}` +
    `&mode=driving` +
    `&key=${encodeURIComponent(serverKey)}`;

  const r = await fetch(url, { method: "GET" });
  const data = await r.json();

  if (!r.ok) throw new Error(`Google Directions HTTP error: ${r.status}`);
  if (data.status !== "OK") {
    throw new Error(
      `Google Directions error: ${data.status}${
        data.error_message ? ` - ${data.error_message}` : ""
      }`
    );
  }

  // ✅ sum ALL legs
  const legs = data.routes?.[0]?.legs ?? [];
  const meters = legs.reduce((sum: number, l: any) => sum + (l?.distance?.value ?? 0), 0);
  const seconds = legs.reduce((sum: number, l: any) => sum + (l?.duration?.value ?? 0), 0);

  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];

  return {
    distanceKm: round2(meters / 1000),
    durationMin: Math.max(1, Math.round(seconds / 60)),
    start_address: firstLeg?.start_address as string | undefined,
    end_address: lastLeg?.end_address as string | undefined,
  };
}

type BookingWhen = "now" | "later";
type StopItem = { address?: string; placeId?: string };

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY || "";
    if (!serverKey) {
      return NextResponse.json(
        { ok: false, error: "GOOGLE_MAPS_SERVER_KEY missing in Vercel env" },
        { status: 500 }
      );
    }

    const pickupPlaceId = String(body?.pickupPlaceId || "");
    const dropoffPlaceId = String(body?.dropoffPlaceId || "");

    if (!pickupPlaceId || !dropoffPlaceId) {
      return NextResponse.json(
        { ok: false, error: "pickupPlaceId / dropoffPlaceId missing" },
        { status: 400 }
      );
    }

    // ✅ Stops from client (max 2)
    const stopsRaw = (body?.stops as StopItem[]) || [];
    const stopPlaceIds = Array.isArray(stopsRaw)
      ? stopsRaw
          .map((s) => String(s?.placeId || ""))
          .filter(Boolean)
          .slice(0, 2)
      : [];

    // Booking time for tariff
    const bookingWhen = (body?.bookingWhen as BookingWhen) || "now";
    const laterDate = body?.date as string | undefined;
    const laterTime = body?.time as string | undefined;

    let tripDate = new Date();
    if (
      bookingWhen === "later" &&
      laterDate &&
      laterTime &&
      laterDate !== "now" &&
      laterTime !== "now"
    ) {
      const d = new Date(`${laterDate}T${laterTime}:00`);
      if (!Number.isNaN(d.getTime())) tripDate = d;
    }

    // ✅ Server route distance + duration (with stops)
    const route = await fetchServerRoute({
      serverKey,
      pickupPlaceId,
      dropoffPlaceId,
      stopPlaceIds,
    });

    const fare = calcFare({
      carType: String(body?.carType || "Sedan 4Pax"),
      passengers: Number(body?.passengers || 1),
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      tripDate,
      pickupText: String(body?.pickup || ""),
      serverStartAddress: route.start_address,
    });

    return NextResponse.json({
      ok: true,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      estimatedFare: fare.total,
      fareBreakdown: fare,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
