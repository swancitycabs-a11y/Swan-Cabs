import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GOOGLE_TZ = "Australia/Perth";

const TARIFF = {
  day: { flagfall: 5.4, perKm: 2.13, perHour: 61.0 },
  night: { flagfall: 7.7, perKm: 2.13, perHour: 61.0 },
  fivePlus: { flagfall: 7.7, perKm: 3.19, perHour: 95.0 },
};

const EXTRAS = {
  bookingFee: 1.9,
  airportFee: 4.5,
  ultraPeak: 4.5,
  christmasDay: 6.4,
  newYears: 7.4,
  babySeat: 15,
  peakTrafficRate: 0.1,
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

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    weekday: get("weekday"),
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function weekdayToIndex(weekday: string) {
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? -1;
}

function isDayTariff(perth: ReturnType<typeof getPerthParts>) {
  const dayIndex = weekdayToIndex(perth.weekday);
  const isMonToFri = dayIndex >= 1 && dayIndex <= 5;
  const is6to18 = perth.hour >= 6 && perth.hour < 18;
  return isMonToFri && is6to18;
}

function isPeakTraffic(perth: ReturnType<typeof getPerthParts>) {
  const minutesSinceMidnight = perth.hour * 60 + perth.minute;

  const morningPeak =
    minutesSinceMidnight >= 6 * 60 + 30 &&
    minutesSinceMidnight < 9 * 60;

  const afternoonPeak =
    minutesSinceMidnight >= 14 * 60 + 30 &&
    minutesSinceMidnight < 18 * 60;

  return morningPeak || afternoonPeak;
}

function isUltraPeak(perth: ReturnType<typeof getPerthParts>) {
  const dayIndex = weekdayToIndex(perth.weekday);
  if (dayIndex === 5) return true;
  if (dayIndex === 6) return true;
  if (dayIndex === 0 && perth.hour < 3) return true;
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

function parsePerthBookingDate(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
  babySeat: number;
  peakTraffic: number;
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
    isAirportPickup(pickupText) ||
    isAirportPickup(serverStartAddress || "");

  const airportFee = pickupLooksAirport ? EXTRAS.airportFee : 0;
  const ultraPeak = isUltraPeak(perth) ? EXTRAS.ultraPeak : 0;
  const christmas = isChristmasDay(perth) ? EXTRAS.christmasDay : 0;
  const newYears = isNewYearsSurcharge(perth) ? EXTRAS.newYears : 0;

  const babySeatFee =
    carType === "Baby Seat Sedan" ||
    carType === "Baby Seat Maxi Taxi 7 Pax"
      ? EXTRAS.babySeat
      : 0;

  const subtotal =
    flagfall +
    variablePart +
    bookingFee +
    airportFee +
    ultraPeak +
    christmas +
    babySeatFee +
    newYears;

  const peakTraffic = isPeakTraffic(perth)
    ? subtotal * EXTRAS.peakTrafficRate
    : 0;

  const total = subtotal + peakTraffic;

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
    babySeat: round2(babySeatFee),
    peakTraffic: round2(peakTraffic),
    total: round2(total),
  };
}

async function fetchServerRoute(params: {
  serverKey: string;
  pickupPlaceId: string;
  dropoffPlaceId: string;
  stopPlaceIds?: string[];
}) {
  const {
    serverKey,
    pickupPlaceId,
    dropoffPlaceId,
    stopPlaceIds = [],
  } = params;

  const validStops = stopPlaceIds.filter(Boolean).slice(0, 2);

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

  const response = await fetch(url, { method: "GET" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Google Directions HTTP error: ${response.status}`);
  }

  if (data.status !== "OK") {
    throw new Error(
      `Google Directions error: ${data.status}${
        data.error_message ? ` - ${data.error_message}` : ""
      }`
    );
  }

  const legs = data.routes?.[0]?.legs ?? [];
  const meters = legs.reduce(
    (sum: number, leg: any) => sum + (leg?.distance?.value ?? 0),
    0
  );
  const seconds = legs.reduce(
    (sum: number, leg: any) => sum + (leg?.duration?.value ?? 0),
    0
  );

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

    const stopsRaw = (body?.stops as StopItem[]) || [];
    const stopPlaceIds = Array.isArray(stopsRaw)
      ? stopsRaw
          .map((stop) => String(stop?.placeId || ""))
          .filter(Boolean)
          .slice(0, 2)
      : [];

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
      const parsedDate = parsePerthBookingDate(laterDate, laterTime);
      if (parsedDate) tripDate = parsedDate;
    }

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
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
