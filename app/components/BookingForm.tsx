"use client";


import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  DirectionsRenderer,
  GoogleMap,
  useJsApiLoader,
} from "@react-google-maps/api";

type WhenType = "now" | "later";
type ReturnTrip = "No" | "Yes";
type LatLngLiteral = { lat: number; lng: number };
type PricingMode = "meter" | "fixed";

const libraries = ["places"] as const;

// Rough WA bounds
const WA_BOUNDS = {
  north: -13.5,
  south: -35.5,
  east: 129.0,
  west: 112.5,
};

const PERTH_CENTER: LatLngLiteral = { lat: -31.9523, lng: 115.8613 };

// Tariff table (Unbooked Service Fares as at 3 May 2024)
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

};

function isPlaceInWA(place: google.maps.places.PlaceResult) {
  const comps = place.address_components || [];
  const state = comps.find((c) =>
    c.types?.includes("administrative_area_level_1")
  );
  const stateName = state?.long_name || "";
  const stateShort = state?.short_name || "";
  return stateName === "Western Australia" || stateShort === "WA";
}
 function isUberLevelValidAddress(place: google.maps.places.PlaceResult) {
  if (!place) return false;

  const types = place.types || [];
  const comps = place.address_components || [];

  const hasStreetNumber = comps.some((c) =>
    c.types.includes("street_number")
  );

  const isBusiness =
    types.includes("establishment") ||
    types.includes("premise") ||
    types.includes("subpremise");

  // ⭐ NEW — airport detection
  const isAirport =
    types.includes("airport") ||
    types.includes("point_of_interest");

  const isStreetAddress = types.includes("street_address");

  // 🚫 too broad ONLY if it is PURE locality (Perth/Nedlands)
  const isOnlyLocality =
    types.includes("locality") &&
    !isBusiness &&
    !hasStreetNumber &&
    !isAirport;

  return !isOnlyLocality && (isStreetAddress || hasStreetNumber || isBusiness || isAirport);
}


// ✅ Airport detection for BOTH pickup & dropoff
function isAirportLocation(address: string) {
  const s = (address || "").toLowerCase();
  return (
    s.includes("airport") ||
    s.includes("terminal") ||
    s.includes("intl") ||
    s.includes("international") ||
    /\bt1\b|\bt2\b|\bt3\b|\bt4\b/.test(s)
  );
}

function getPerthNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Australia/Perth" })
  );
}


function formatPerthDateTime(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
}
function formatTimeAMPM(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}
function formatDateDMY(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}



function getDayName(d: Date) {
  return d.toLocaleDateString("en-AU", { weekday: "long" });
}

function parseLaterLocal(date: string, time: string): Date | null {
  
if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isDayTariff(perthDate: Date) {
  const day = perthDate.getDay();
  const hour = perthDate.getHours();
  const isMonToFri = day >= 1 && day <= 5;
  const is6to18 = hour >= 6 && hour < 18;
  return isMonToFri && is6to18;
}

function isUltraPeak(perthDate: Date) {
  const day = perthDate.getDay(); // 0 Sun, 5 Fri, 6 Sat
  const hour = perthDate.getHours();
  if (day === 5) return true;
  if (day === 6) return true;
  if (day === 0 && hour < 3) return true;
  return false;
}

function isChristmasDay(perthDate: Date) {
  return perthDate.getMonth() === 11 && perthDate.getDate() === 25;
}

function isNewYearsSurcharge(perthDate: Date) {
  const m = perthDate.getMonth();
  const d = perthDate.getDate();
  const h = perthDate.getHours();
  if (m === 11 && d === 31 && h >= 18) return true;
  if (m === 0 && d === 1 && h < 6) return true;
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
  babySeat: number;   // ✅ add this
  total: number;
};

function calcFare(params: {
  carType: string;
  passengers: number;
  distanceKm: number;
  durationMin: number;
  perthDate: Date;
  pickupAddress: string;
 
}): FareBreakdown {
  const {
    carType,
    passengers,
    distanceKm,
    durationMin,
    perthDate,
    pickupAddress,
  } = params;

  const fivePlusApplies =
    passengers >= 5 ||
    carType === "Wagon 4 Pax + Luggage" ||
    carType === "Maxi Taxi 7 Pax" ||
    carType === "Baby Seat Sedan" ||
    carType === "Baby Seat Maxi Taxi 7 Pax" ||
    carType === "Maxi Taxi 10 Pax + Wheelchair";

  const tariff = fivePlusApplies
    ? TARIFF.fivePlus
    : isDayTariff(perthDate)
    ? TARIFF.day
    : TARIFF.night;

  const tariffLabel = fivePlusApplies
    ? "5+ passengers tariff"
    : isDayTariff(perthDate)
    ? "Day tariff"
    : "Night/Weekend tariff";

  const flagfall = tariff.flagfall;

  const distancePart = distanceKm > 0 ? distanceKm * tariff.perKm : 0;
  const timeHours = durationMin > 0 ? durationMin / 60 : 0;
  const timePart = timeHours > 0 ? timeHours * tariff.perHour : 0;

  const variablePart = Math.max(distancePart, timePart);

  const bookingFee = EXTRAS.bookingFee;

  // ✅ Airport fee ONLY when pickup is from airport (your existing rule)
  const airportFee = isAirportLocation(pickupAddress) ? EXTRAS.airportFee : 0;

  const ultraPeak = isUltraPeak(perthDate) ? EXTRAS.ultraPeak : 0;
  const christmas = isChristmasDay(perthDate) ? EXTRAS.christmasDay : 0;
  const newYears = isNewYearsSurcharge(perthDate) ? EXTRAS.newYears : 0;
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
    newYears +
    babySeatFee;

  const r2 = (n: number) => Math.round(n * 100) / 100;

  return {
    tariffLabel,
    flagfall: r2(flagfall),
    distancePart: r2(distancePart),
    timePart: r2(timePart),
    variablePart: r2(variablePart),
    bookingFee: r2(bookingFee),
    airportFee: r2(airportFee),
    ultraPeak: r2(ultraPeak),
    christmas: r2(christmas),
    newYears: r2(newYears),
    babySeat: r2(babySeatFee), // ✅
    total: r2(total),
  };
}

type StopItem = { address: string; placeId: string };

export default function BookingForm({ isEdit = false, initialData = null }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: libraries as unknown as ("places")[],
  });

  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupPlaceId, setPickupPlaceId] = useState("");
  const [dropoffPlaceId, setDropoffPlaceId] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [handCarryBags, setHandCarryBags] = useState("");
  const [checkInBags, setCheckInBags] = useState("");
  const [pickupError, setPickupError] = useState("");
  const [dropoffError, setDropoffError] = useState("");
  const [stopErrors, setStopErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);



  // ✅ Stops (max 2)
  const [stops, setStops] = useState<StopItem[]>([]);
  const stopRefs = useRef<Array<google.maps.places.Autocomplete | null>>([]);

  const [when, setWhen] = useState<WhenType>("now");
  const [date, setDate] = useState("");


  const [time, setTime] = useState("");

  const [carType, setCarType] = useState("Sedan 4Pax");
  const [passengers, setPassengers] = useState(1);

  const [pricingMode, setPricingMode] = useState<PricingMode>("fixed");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

 // ✅ OTP states
const [otp, setOtp] = useState("");
const [otpSent, setOtpSent] = useState(false);
const [phoneVerified, setPhoneVerified] = useState(false);
const [otpLoading, setOtpLoading] = useState(false);

const [otpInfo, setOtpInfo] = useState("");
const [otpError, setOtpError] = useState("");
const [resendTimer, setResendTimer] = useState(0);
const [otpAttempts, setOtpAttempts] = useState(0);
const maxAttempts = 3;
  // how many times resend allowed after 3 wrong OTP
const [resendAfterFailCount, setResendAfterFailCount] = useState(0);

// per-number 5 min block
const getOtpBlockUntil = () =>
  Number(localStorage.getItem(`otpBlockUntil_${phone}`) || 0);

const setOtpBlock5Min = () => {
  localStorage.setItem(
    `otpBlockUntil_${phone}`,
    (Date.now() + 5 * 60 * 1000).toString()
  );
};

const isOtpBlocked = () => Date.now() < getOtpBlockUntil();


  // 🚫 block same phone for 5 minutes after booking
const isPhoneBlocked = () => {
  const until = localStorage.getItem("blockedPhoneUntil");
  if (!until) return false;
  return Date.now() < Number(until);
};




  const [returnTrip, setReturnTrip] = useState<ReturnTrip>("No");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");

  useEffect(() => {
  if (resendTimer <= 0) return;

  const t = setInterval(() => {
    setResendTimer((s) => s - 1);
  }, 1000);

  return () => clearInterval(t);
}, [resendTimer]);
  // ✅ Show message if this number was verified recently (after refresh)
useEffect(() => {
  if (!phone) return;

  if (isOtpBlocked()) {
    setOtpError(
      "⛔ This number was verified recently. Try again in 5 minutes."
    );
  } else {
    setOtpError("");
  }
}, [phone]);



  // ✅ NEW: Flight number fields
  const [flightNumber, setFlightNumber] = useState("");
  const [returnFlightNumber, setReturnFlightNumber] = useState("");

  const [specialRequest, setSpecialRequest] = useState("");
  


  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationMin, setDurationMin] = useState(0);

  const [fareLoading, setFareLoading] = useState(false);
  const [serverEstimate, setServerEstimate] = useState<number | null>(null);
  const [serverBreakdown, setServerBreakdown] =
    useState<FareBreakdown | null>(null);
  const [serverDistanceKm, setServerDistanceKm] = useState<number | null>(null);
  const [serverDurationMin, setServerDurationMin] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  

  const pickupAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const dropoffAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  

  // ✅ Date & time picker refs
const laterDateRef = useRef<HTMLInputElement>(null);
const laterTimeRef = useRef<HTMLInputElement>(null);

const returnDateRef = useRef<HTMLInputElement>(null);
const returnTimeRef = useRef<HTMLInputElement>(null);


  const [mapCenter, setMapCenter] = useState<LatLngLiteral>(PERTH_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(11);

  const waLatLngBounds = useMemo(() => {
    if (!isLoaded) return undefined;
    if (typeof window === "undefined") return undefined;
    if (!window.google?.maps) return undefined;

    return new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(WA_BOUNDS.south, WA_BOUNDS.west),
      new window.google.maps.LatLng(WA_BOUNDS.north, WA_BOUNDS.east)
    );
  }, [isLoaded]);

  const perthDateForFare = useMemo(() => {
    if (when === "later") {
      const d = parseLaterLocal(date, time);
      return d ?? getPerthNow();
    }
    return getPerthNow();
  }, [when, date, time]);

  const clientFare = useMemo(() => {
    return calcFare({
      carType,
      passengers,
      distanceKm,
      durationMin,
      perthDate: perthDateForFare,
      pickupAddress: pickup,
     

    });
  }, [carType, passengers, distanceKm, durationMin, perthDateForFare, pickup]);

  const displayFare = serverBreakdown ?? clientFare;

  // ✅ Route readiness: pickup+dropoff, and if any stop exists it must be selected from suggestions
  const stopsReady = stops.every(
    (s) => s.address === "" || (s.address && s.placeId)
  );
  const hasRoute = Boolean(pickupPlaceId && dropoffPlaceId && stopsReady);

  const displayDistance = hasRoute
    ? Number(serverDistanceKm ?? distanceKm)
    : null;
  const displayDuration = hasRoute
    ? Number(serverDurationMin ?? durationMin)
    : null;

  const meterTotal = hasRoute ? Number(serverEstimate ?? clientFare.total) : null;

  const MARKUP_PERCENT = 17;
  const MINIMUM_FARE = 22.5;
  const finalTotal =
  meterTotal == null
    ? null
    : Math.max(
        MINIMUM_FARE,
        Math.round(meterTotal * (1 + MARKUP_PERCENT / 100) * 100) / 100
      );

  // ✅ Fixed fare
  const fixedFare = finalTotal;

  // ✅ Meter range = -5% to +20%
  const meterLow =
    fixedFare == null ? null : Math.round(fixedFare * 0.95 * 100) / 100;

  const meterHigh =
    fixedFare == null ? null : Math.round(fixedFare * 1.2 * 100) / 100;

  // ✅ NEW: show flight fields when pickup OR dropoff is airport
  const pickupIsAirport = useMemo(() => isAirportLocation(pickup), [pickup]);
  const dropoffIsAirport = useMemo(() => isAirportLocation(dropoff), [dropoff]);

  // ✅ LUGGAGE FIELD RULES
const luggageVehicles = [
  "Wagon 4 Pax + Luggage",
  "Maxi Taxi 7 Pax",
  "Baby Seat Maxi Taxi 7 Pax",
  "Maxi Taxi 10 Pax + Wheelchair",
];

const showLuggageFields =
  luggageVehicles.includes(carType) &&
  (pickupIsAirport || dropoffIsAirport);
  // ✅ CORRECT LOCATION
useEffect(() => {
  if (!showLuggageFields) {
    setHandCarryBags("");
    setCheckInBags("");
  }
}, [showLuggageFields]);
 // ✅ Show flight number rules:
// - Airport PICKUP: always show flight number
// - Airport DROPOFF: show flight number ONLY if return trip is YES
const showFlightNumber =
  pickupIsAirport || (dropoffIsAirport && returnTrip === "Yes");

// ✅ Return flight number field only when return trip is YES AND flight section is shown
const showReturnFlightNumber = returnTrip === "Yes" && showFlightNumber;


  function setWhenSafe(value: WhenType) {
    setWhen(value);
    if (value === "now") {
      setDate("");
      setTime("");
    }
  }

  function setReturnTripSafe(value: ReturnTrip) {
  setReturnTrip(value);

  if (value === "No") {
    setReturnDate("");
    setReturnTime("");

    // ✅ clear return flight field
    setReturnFlightNumber("");

    // ✅ clear flight number ONLY if it was shown because of airport dropoff
    // (if pickup is airport, we still want flight number)
    if (!pickupIsAirport) setFlightNumber("");
  }
}


  // ✅ Stops helpers (max 2)
  function addStop() {
    setStops((prev) => {
      if (prev.length >= 2) return prev;
      return [...prev, { address: "", placeId: "" }];
    });
  }

  function removeStop(index: number) {
    setStops((prev) => prev.filter((_, i) => i !== index));
    stopRefs.current.splice(index, 1);
  }

  function updateStop(index: number, patch: Partial<StopItem>) {
    setStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  // Directions line (client) — ✅ includes stops as waypoints
  useEffect(() => {
    if (!isLoaded) return;
    if (!window.google?.maps) return;

    // if stop opened but not selected yet -> reset route (so fare won't show wrong)
    const anyStopInvalid = stops.some((s) => s.address && !s.placeId);
    if (!pickupPlaceId || !dropoffPlaceId || anyStopInvalid) {
      setDirections(null);
      setDistanceKm(0);
      setDurationMin(0);
      return;
    }

    const service = new window.google.maps.DirectionsService();

    const waypoints =
      stops
        .filter((s) => s.placeId)
        .map((s) => ({ location: { placeId: s.placeId }, stopover: true })) ??
      [];

    service.route(
      {
        origin: { placeId: pickupPlaceId },
        destination: { placeId: dropoffPlaceId },
        travelMode: window.google.maps.TravelMode.DRIVING,
        waypoints,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);

          // ✅ sum all legs (pickup -> stop1 -> stop2 -> dropoff)
          const legs = result.routes?.[0]?.legs ?? [];
          const meters = legs.reduce(
            (sum, l) => sum + (l.distance?.value ?? 0),
            0
          );
          const seconds = legs.reduce(
            (sum, l) => sum + (l.duration?.value ?? 0),
            0
          );

          setDistanceKm(Number((meters / 1000).toFixed(1)));
          setDurationMin(Math.max(1, Math.round(seconds / 60)));
        } else {
          setDirections(null);
          setDistanceKm(0);
          setDurationMin(0);
        }
      }
    );
  }, [isLoaded, pickupPlaceId, dropoffPlaceId, stops]);

  // ✅ Auto-fit map to route (no zoomed-out map)
  useEffect(() => {
    if (!mapRef.current || !directions) return;

    const map = mapRef.current;

    // ✅ Fit map to the route bounds
    const bounds = new window.google.maps.LatLngBounds();
    const legs = directions.routes?.[0]?.legs || [];

    legs.forEach((leg) => {
      if (leg.start_location) bounds.extend(leg.start_location);
      if (leg.end_location) bounds.extend(leg.end_location);
    });

    // ✅ Padding around route (prevents it touching edges)
    map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });

    // ✅ After fitBounds settles, adjust zoom smartly
    window.google.maps.event.addListenerOnce(map, "idle", () => {
      const z = map.getZoom() ?? 11;

      let MAX_ZOOM = 18;
      let MIN_ZOOM = 10;

      // clamp
      if (z > MAX_ZOOM) map.setZoom(MAX_ZOOM);
      if (z < MIN_ZOOM) map.setZoom(MIN_ZOOM);
    });
  }, [directions, distanceKm, serverDistanceKm]);

  // Server estimate — ✅ send stops too
  useEffect(() => {
    const anyStopInvalid = stops.some((s) => s.address && !s.placeId);

    if (!pickupPlaceId || !dropoffPlaceId || anyStopInvalid) {
      setServerEstimate(null);
      setServerBreakdown(null);
      setServerDistanceKm(null);
      setServerDurationMin(null);
      return;
    }

    if (when === "later" && (!date || !time)) {
      setServerEstimate(null);
      setServerBreakdown(null);
      setServerDistanceKm(null);
      setServerDurationMin(null);
      return;
    }

   

    const controller = new AbortController();
    const t = setTimeout(() => {
      (async () => {
        try {
          setFareLoading(true);

          const res = await fetch("/api/fare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              pickup,
              dropoff,
              pickupPlaceId,
              dropoffPlaceId,
              stops, // ✅ NEW
              carType,
              passengers,
              bookingWhen: when,
              date: when === "later" ? date : "now",
              time: when === "later" ? time : "now",
            }),
          });

          const data = await res.json().catch(() => ({}));

          console.log("BOOKING RESPONSE:", data); // debug

           setBookingId(data.bookingId || "SC-ERROR"); // ✅ IMPORTANT
          if (!res.ok || !data?.ok) throw new Error(data?.error || "Fare failed");

          setServerEstimate(Number(data.estimatedFare));
          setServerBreakdown(data.fareBreakdown as FareBreakdown);
          setServerDistanceKm(Number(data.distanceKm));
          setServerDurationMin(Number(data.durationMin));
        } catch {
          setServerEstimate(null);
          setServerBreakdown(null);
          setServerDistanceKm(null);
          setServerDurationMin(null);
        } finally {
          setFareLoading(false);
        }
      })();
    }, 450);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [
    pickupPlaceId,
    dropoffPlaceId,
    pickup,
    dropoff,
    stops,
    carType,
    passengers,
    when,
    date,
    time,
  ]);


async function sendOtp() {
  if (isOtpBlocked()) {
    setOtpError("⛔ Too many attempts. Try again in 5 minutes.");
    return;
  }

  if (!phone || phone.length < 9) {
    setOtpError("❌ Please enter a valid phone number.");
    return;
  }

  if (resendTimer > 0) return;

  try {
    setOtpLoading(true);
    setOtpError("");
    setOtpInfo("");

    await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: `+61${phone}` }),
    });

    setOtpSent(true);
    setOtpInfo("📩 OTP sent to your phone.");
    setResendTimer(60);

    // track resend after failure
    if (otpAttempts >= maxAttempts) {
      setResendAfterFailCount((c) => c + 1);
    }

    setOtpAttempts(0);
  } catch {
    setOtpError("❌ Failed to send OTP. Try again.");
  } finally {
    setOtpLoading(false);
  }
}



async function verifyOtp() {
  if (otpAttempts >= maxAttempts) {
    setOtpError("❌ Too many attempts. Please resend OTP.");
    return;
  }

  try {
    setOtpLoading(true);
    setOtpError("");
    setOtpInfo("");

    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: `+61${phone}`,
        code: otp,
      }),
    });

    const data = await res.json();

   if (!data.verified) throw new Error();

setPhoneVerified(true);
setOtpSent(false);   // ✅ hide OTP box after success
setOtp("");          // ✅ clear OTP input
setOtpInfo("✅ Phone number verified.");
    // ✅ BLOCK OTP for 5 minutes after success
setOtpBlock5Min();

  } catch {
  const attempts = otpAttempts + 1;
  setOtpAttempts(attempts);
  setOtpError("❌ Invalid OTP.");

  // after 3 wrong OTP, user must wait timer
  if (attempts >= maxAttempts) {
    setOtpError("❌ Too many wrong OTP. Wait for resend timer.");
  }
}
 finally {
    setOtpLoading(false);
  }
}


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    if (!phoneVerified) {
  setLoading(false);
  setMsg("❌ Please verify your phone number before booking.");
  return;
}
    if (isPhoneBlocked()) {
  setLoading(false);
  setMsg("⛔ This number already made a booking. Try again in 5 minutes.");
  return;
}


    if (!pickupPlaceId || !dropoffPlaceId) {
      setLoading(false);
      setMsg("❌ Please choose pickup and dropoff from the suggestions.");
      return;
    }

    // ✅ stop validation
    const anyStopInvalid = stops.some((s) => s.address && !s.placeId);
    if (anyStopInvalid) {
      setLoading(false);
      setMsg("❌ Please choose stop address from the suggestions.");
      return;
    }

    if (when === "later" && (!date || !time)) {
      setLoading(false);
      setMsg("❌ Please select pickup date and time.");
      return;
    }

    if (returnTrip === "Yes" && (!returnDate || !returnTime)) {
      setLoading(false);
      setMsg("❌ Please select return date and time.");
      return;
    }

    // ✅ flight number validation (correct logic)
if (showFlightNumber) {
  if (returnTrip === "Yes") {
    if (!returnFlightNumber.trim()) {
      setLoading(false);
      setMsg("❌ Please enter your return flight number.");
      return;
    }
  } else {
    if (!flightNumber.trim()) {
      setLoading(false);
      setMsg("❌ Please enter your flight number.");
      return;
    }
  }
}

   const final = fixedFare ?? 22.5;
    
    // ✅ Build correct Perth pickup datetime + day
const perthPickupDate =
  when === "later"
    ? parseLaterLocal(date, time) ?? getPerthNow()
    : getPerthNow();

const pickupDateTimePerth = formatPerthDateTime(perthPickupDate);

const pickupDay = getDayName(perthPickupDate);


    const payload = {
      pickup,
      dropoff,
      pickupPlaceId,
      dropoffPlaceId,

      stops,

      bookingWhen: when,
      date: when === "later" ? date : "now",
      time: when === "later" ? time : "now",
      
      pickupDay: pickupDay,
      pickupDateTimePerth: pickupDateTimePerth,

      carType,
    
      passengers,
      handCarryBags: showLuggageFields ? Number(handCarryBags || 0) : 0,
      checkInBags: showLuggageFields ? Number(checkInBags || 0) : 0,

      name,
      phone,
      email,
      

      returnTrip,
      returnDate: returnTrip === "Yes" ? returnDate : "",
      returnTime: returnTrip === "Yes" ? returnTime : "",

      // ✅ NEW
      flightNumber: showFlightNumber ? flightNumber.trim().toUpperCase() : "",
      returnFlightNumber:
        showReturnFlightNumber ? returnFlightNumber.trim().toUpperCase() : "",

      specialRequest,

      distanceKm: Number(displayDistance ?? distanceKm),
      durationMin: Number(displayDuration ?? durationMin),

      pricingMode,

      estimatedFare: final,
      estimatedFareMeter: final,
      estimatedFareFixed: final,
      markupPercent: MARKUP_PERCENT,

      fareBreakdown: displayFare,

      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-booking-secret":
            process.env.NEXT_PUBLIC_BOOKING_WEBHOOK_SECRET || "",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Booking failed");
      // ⭐ GOOGLE ADS HIGH VALUE EVENT (ADD HERE)
if (
  payload.estimatedFare >= 50 &&
  typeof window !== "undefined" &&
  (window as any).gtag
) {
  (window as any).gtag("event", "high_value_booking", {
    value: Number(payload.estimatedFare),
    currency: "AUD",
  });
}

      // WhatsApp admin notification
try {
  await fetch("/api/whatsapp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: payload.name,
    phone: `0${payload.phone}`,
    email: payload.email,

    pickup: payload.pickup,
    dropoff: payload.dropoff,
    stops: payload.stops,

    carType: payload.carType,
    passengers: payload.passengers,

    handCarryBags: payload.handCarryBags,
    checkInBags: payload.checkInBags,

    // ⭐ IMPORTANT
    bookingWhen: payload.bookingWhen,
    date: payload.date,
    time: payload.time,

    returnTrip: payload.returnTrip,
    returnDate: payload.returnDate,
    returnTime: payload.returnTime,

    flightNumber: payload.flightNumber,
    returnFlightNumber: payload.returnFlightNumber,

    estimatedFare: payload.estimatedFare,
    duration: payload.durationMin,

    specialRequest: payload.specialRequest
  })
});
} catch (e) {
  console.log("WhatsApp notify failed", e);
}

      // ⭐ GOOGLE ADS TAXI BOOKING CONVERSION
if (typeof window !== "undefined" && (window as any).gtag) {
  (window as any).gtag("event", "conversion", {
    send_to: "AW-17703324537/YE-kCPupsfwbEPmWzflB",
    value: Number(payload.estimatedFare || 20.5),
    currency: "AUD",
  });
}

setBookingId(data.bookingId);
setShowConfirmation(true);
      localStorage.setItem(
  "blockedPhoneUntil",
  (Date.now() + 5 * 60 * 1000).toString()
);


      setPickup("");
      setDropoff("");
      setPickupPlaceId("");
      setDropoffPlaceId("");
      setStops([]);

      setWhen("now");
      setDate("");
      setTime("");

      setCarType("Sedan 4Pax");
      setPassengers(1);

      setPricingMode("fixed");

      setName("");
      setPhone("");
      

// ✅ RESET OTP STATE
setOtp("");
setOtpSent(false);
setPhoneVerified(false);



      setEmail("");

      setReturnTrip("No");
      setReturnDate("");
      setReturnTime("");

      // ✅ reset flight fields
      setFlightNumber("");
      setReturnFlightNumber("");

      setSpecialRequest("");
      


      setDirections(null);
      setDistanceKm(0);
      setDurationMin(0);

      setServerEstimate(null);
      setServerBreakdown(null);
      setServerDistanceKm(null);
      setServerDurationMin(null);
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Something went wrong"}`);
    } finally {
      setLoading(false);
    }
  }
  function confirmSubmit() {

  // ⭐ PRO EVENT — Airport Ride
  if ((pickupIsAirport || dropoffIsAirport) &&
      typeof window !== "undefined" &&
      (window as any).gtag) {

    (window as any).gtag("event", "airport_booking_intent", {
      event_category: "Booking",
      event_label: "Airport Ride",
    });
  }

  const fakeEvent = {
    preventDefault: () => {},
  } as React.FormEvent;

  onSubmit(fakeEvent);
}


  if (!apiKey) {
    return (
      <section id="book" className="section">
        <div className="container">
          <div className="card">
            <div className="small">❌ Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</div>
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section id="book" className="section">
        <div className="container">
          <div className="card">
            <div className="small">
              ❌ Google Maps failed to load. Check API key + referrer restrictions
              + enabled APIs (Maps JS, Places, Directions).
            </div>
          </div>
        </div>
              
    </section>
  );
}


  // ✅ button behavior:
  // - show "+ Add stop" if 0 stops
  // - show "+ Add another stop" only when stop1 has placeId and stops < 2
  const canShowAddStop =
    stops.length === 0 || (stops.length === 1 && Boolean(stops[0]?.placeId));

  const addStopLabel = stops.length === 0 ? " Add a stop" : " Add another stop";

  return (
     <>
    <section id="book" className="section">
      <div className="container">
        <div className="grid cols-2">
          {/* LEFT */}
          <div className="card">
  <div style={{ textAlign: "center", marginBottom: 16 }}>
    <h2>Book a Taxi</h2>
    <div className="badge">🚕 Perth Airport • City • FIFO • 24/7</div>

  </div>


            {/* MAP */}
            <div className="card mapCard">
              {!isLoaded ? (
                <div className="small">Loading map…</div>
              ) : (
                <GoogleMap
                  mapContainerClassName="mapContainer"
                  center={mapCenter}
                  zoom={mapZoom}
                  onLoad={(map) => {
                    mapRef.current = map;
                  }}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false,
                  }}
                >
                  {directions && (
                    <DirectionsRenderer
                      directions={directions}
                      options={{ preserveViewport: true }}
                    />
                  )}
                </GoogleMap>
              )}
            </div>

            

           {/* FARE BOX */}
<div className="card fareBox">
  <div className="fareRowPremium">

    {/* LABEL */}
    <span className="fareLabel small">
      {pricingMode === "fixed"
        ? "Fixed price (no additional charges)"
        : "Meter estimate"}
    </span>

    {/* TOGGLE */}
    <button
      type="button"
      className={`priceToggle ${pricingMode === "fixed" ? "on" : ""}`}
      onClick={() =>
        setPricingMode(pricingMode === "fixed" ? "meter" : "fixed")
      }
      aria-label="Toggle pricing mode"
    >
      <span className="toggleThumb">
        {pricingMode === "fixed" ? "✓" : "✕"}
      </span>
    </button>

    {/* PRICE */}
    <div className="farePricePremium">
      {pricingMode === "meter" ? (
        fixedFare == null ? (
          "—"
        ) : (
          <>
            ${Number(meterLow ?? 0).toFixed(2)} – $
            {Number(meterHigh ?? 0).toFixed(2)}
          </>
        )
      ) : fixedFare == null ? (
        "—"
      ) : (
        `$${Number(fixedFare).toFixed(2)}`
      )}
    </div>

  </div>

  {fareLoading && (
    <div className="small" style={{ marginTop: 8, opacity: 0.75 }}>
      Calculating…
    </div>
  )}
</div>

   </div>      


          {/* RIGHT */}
          <div className="card">
            {!isLoaded ? (
              <div className="small">Loading maps…</div>
            ) : (
              <form
 onSubmit={(e) => {
  e.preventDefault();

  // ⭐ PRO EVENT — User opened review modal
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "review_booking_opened", {
      event_category: "Booking",
      event_label: "Review Modal",
    });
  }

  setShowReview(true);
}}
  className="grid"
  style={{ gap: 12 }}
>

                {/* Pickup */}
                <Autocomplete
                  onLoad={(a) => {
                    pickupAutoRef.current = a;
                    a.setOptions({
                      bounds: waLatLngBounds,
                      strictBounds: true,
                      componentRestrictions: { country: "au" },
                      fields: [
                        "place_id",
                        "name",
                        "formatted_address",
                        "address_components",
                        "types",
                      ],
                      types: ["geocode", "establishment"],
                    });
                  }}
                  onPlaceChanged={() => {
                    const place = pickupAutoRef.current?.getPlace();
                    if (!place?.place_id || !place?.formatted_address) return;

                    if (!isPlaceInWA(place)) {
                      setMsg(
                        "❌ Please choose a pickup address in Western Australia."
                      );
                      setPickup("");
                      setPickupPlaceId("");
                      return;
                    }
                    if (!isUberLevelValidAddress(place)) {
  setPickupError("❌ Please select a full street address or business location.");
setPickup("");
setPickupPlaceId("");
return;
}

                    setMsg(null);
setPickupError("");   // ✅ clears red error under pickup
const types = place.types || [];

const isBusiness =
  types.includes("establishment") ||
  types.includes("point_of_interest") ||
  types.includes("premise") ||
  types.includes("subpremise");

const formatted = place.formatted_address || "";
const name = place.name || "";

// ⭐ Prevent duplicate street names
const nameAlreadyInside = formatted
  .toLowerCase()
  .startsWith(name.toLowerCase());

const fullAddress =
  isBusiness && name && !nameAlreadyInside
    ? `${name}, ${formatted}`
    : formatted;

setPickup(fullAddress);
setPickupPlaceId(place.place_id);
                  }}
                >
                  <input
  className="input"
  style={{
    borderColor: pickupError ? "#ef4444" : undefined,
    boxShadow: pickupError ? "0 0 0 1px #ef4444" : undefined,
  }}
  placeholder="📍 Pickup location (WA only)"
  value={pickup}
  onChange={(e) => {
    setPickup(e.target.value);
    setPickupPlaceId("");
    setPickupError(""); // ⭐ clear red border while typing
  }}
  required
/>
                </Autocomplete>
                {pickupError && (
  <div className="small" style={{ color: "#ef4444", marginTop: 4 }}>
    {pickupError}
  </div>
)}

                {/* ✅ Stops (max 2) + plus button behavior */}
{stops.map((s, idx) => (
  <div key={idx} style={{ display: "grid", gap: 8 }}>
    <Autocomplete
      onLoad={(a) => {
        stopRefs.current[idx] = a;
        a.setOptions({
          bounds: waLatLngBounds,
          strictBounds: true,
          componentRestrictions: { country: "au" },
          fields: ["place_id", "name", "formatted_address", "address_components", "types",],
          types: ["geocode", "establishment"],
        });
      }}
      onPlaceChanged={() => {
        const place = stopRefs.current[idx]?.getPlace();
        if (!place?.place_id || !place?.formatted_address) return;

        if (!isPlaceInWA(place)) {
          setStopErrors((prev) => {
            const copy = [...prev];
            copy[idx] = "❌ Please choose a WA address.";
            return copy;
          });

          updateStop(idx, { address: "", placeId: "" });
          return;
        }

        if (!isUberLevelValidAddress(place)) {
          setStopErrors((prev) => {
            const copy = [...prev];
            copy[idx] =
              "❌ Please select a full street address or business location.";
            return copy;
          });

          updateStop(idx, { address: "", placeId: "" });
          return;
        }

        // ✅ SUCCESS
        setStopErrors((prev) => {
          const copy = [...prev];
          copy[idx] = "";
          return copy;
        });

       const types = place.types || [];

const isBusiness =
  types.includes("establishment") ||
  types.includes("point_of_interest") ||
  types.includes("premise") ||
  types.includes("subpremise");

const formatted = place.formatted_address || "";
const name = place.name || "";

// ⭐ Prevent duplicate street names
const nameAlreadyInside = formatted
  .toLowerCase()
  .startsWith(name.toLowerCase());

const fullAddress =
  isBusiness && name && !nameAlreadyInside
    ? `${name}, ${formatted}`
    : formatted;
updateStop(idx, {
  address: fullAddress,
  placeId: place.place_id,
});
      }}
    >
      <input
        className="input"
        style={{
          borderColor: stopErrors[idx] ? "#ef4444" : undefined,
          boxShadow: stopErrors[idx] ? "0 0 0 1px #ef4444" : undefined,
        }}
        placeholder={`Stop ${idx + 1} (optional)`}
        value={s.address}
        onChange={(e) => {
          updateStop(idx, {
            address: e.target.value,
            placeId: "",
          });

          setStopErrors((prev) => {
            const copy = [...prev];
            copy[idx] = "";
            return copy;
          });
        }}
      />
    </Autocomplete>

    {/* ⭐ ERROR UNDER STOP FIELD */}
    {stopErrors[idx] && (
      <div className="small" style={{ color: "#ef4444", marginTop: 4 }}>
        {stopErrors[idx]}
      </div>
    )}

    <button
      type="button"
      className="btn"
      style={{ justifySelf: "start", padding: "8px 12px" }}
      onClick={() => removeStop(idx)}
    >
      Remove stop
    </button>
  </div>
))}

                {canShowAddStop && stops.length < 2 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={addStop}
                    style={{ justifyContent: "center" }}
                  >
                    <span
                      style={{ fontWeight: 900, fontSize: 18, lineHeight: 1 }}
                    >
                      ＋
                    </span>
                    <span>{addStopLabel}</span>
                  </button>
                )}

                {/* Dropoff */}
                <Autocomplete
                  onLoad={(a) => {
                    dropoffAutoRef.current = a;
                    a.setOptions({
                      bounds: waLatLngBounds,
                      strictBounds: true,
                      componentRestrictions: { country: "au" },
                      fields: [
                        "place_id",
                        "name",
                        "formatted_address",
                        "address_components",
                        "types",
                      ],
                      types: ["geocode", "establishment"],
                    });
                  }}
                  onPlaceChanged={() => {
                    const place = dropoffAutoRef.current?.getPlace();
                    if (!place?.place_id || !place?.formatted_address) return;

                    if (!isPlaceInWA(place)) {
                      setMsg(
                        "❌ Please choose a dropoff address in Western Australia."
                      );
                      setDropoff("");
                      setDropoffPlaceId("");
                      return;
                    }
                    if (!isUberLevelValidAddress(place)) {
  setDropoffError("❌ Please select a full street address or business location.");
  setDropoff("");
  setDropoffPlaceId("");
  return;
}

                    setMsg(null);
                    const types = place.types || [];

const isBusiness =
  types.includes("establishment") ||
  types.includes("point_of_interest") ||
  types.includes("premise") ||
  types.includes("subpremise");

const formatted = place.formatted_address || "";
const name = place.name || "";

// ⭐ Prevent duplicate street names
const nameAlreadyInside = formatted
  .toLowerCase()
  .startsWith(name.toLowerCase());

const fullAddress =
  isBusiness && name && !nameAlreadyInside
    ? `${name}, ${formatted}`
    : formatted;

setDropoff(fullAddress);
                    setDropoffPlaceId(place.place_id);
                  }}
                >
                  <input
  className="input"
  style={{
    borderColor: dropoffError ? "#ef4444" : undefined,
    boxShadow: dropoffError ? "0 0 0 1px #ef4444" : undefined,
  }}
  placeholder="🏁 Dropoff location (WA only)"
  value={dropoff}
  onChange={(e) => {
    setDropoff(e.target.value);
    setDropoffPlaceId("");
    setDropoffError(""); // ⭐ clear red border while typing
  }}
  required
/>
                </Autocomplete>
                {dropoffError && (
  <div className="small" style={{ color: "#ef4444", marginTop: 4 }}>
    {dropoffError}
  </div>
)}

                {/* Booking time */}
                <div className="card" style={{ padding: 10 }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                  
                  </div>

                  <div
                    className="radioRow"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <label
                      className="small"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <input
                        type="radio"
                        name="when"
                        checked={when === "now"}
                        onChange={() => setWhenSafe("now")}
                      />
                      ⚡ Book for now
                    </label>

                    <label
                      className="small"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <input
                        type="radio"
                        name="when"
                        checked={when === "later"}
                        onChange={() => setWhenSafe("later")}
                      />
                     📅 Book for later   
                    </label>
                  </div>
{when === "later" && (
  <div className="grid cols-2" style={{ marginTop: 10, gap: 8 }}>
    <div>
      <div className="small">Date (dd/mm/yyyy)</div>
      <input
        className="input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
    </div>

    <div>
      <div className="small">Time (hh:mm AM/PM)</div>
      <input
        className="input"
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        step="60"
        required
      />
    </div>
  </div>
)}
 </div>


    <div className="grid cols-2">
  <select
    className="select"
    value={carType}
    onChange={(e) => setCarType(e.target.value)}
  >
    <option>Sedan 4 Pax</option>
<option>Wagon 4 Pax + Luggage</option>
<option>Maxi Taxi 7 Pax</option>
<option>Baby Seat Sedan</option>
<option>Baby Seat Maxi Taxi 7 Pax</option>
<option>Parcel Delivery</option>
<option>Maxi Taxi 10 Pax + Wheelchair</option>
  </select>

  <select
  className="select"
  value={passengers}
 onChange={(e) => {
  const val = Number(e.target.value);

  setPassengers(val);

  setCarType((prev) => {
    // ⭐ upgrade rules ONLY
    if (val >= 8) return "Maxi Taxi 10 Pax + Wheelchair";

    if (val >= 5) {
      if (prev === "Maxi Taxi 10 Pax + Wheelchair") return prev;
      return "Maxi Taxi 7 Pax";
    }

    // ⭐ NEVER downgrade automatically
    return prev;
  });
}}
>
  {Array.from({ length: 13 }, (_, i) => i + 1).map((num) => (
    <option key={num} value={num}>
      {num} Passenger{num > 1 ? "s" : ""}
    </option>
  ))}
</select>
</div>
               

{/* ✅ AUTO LUGGAGE FIELDS — OUTSIDE SELECT */}
{showLuggageFields && (
  <div className="card" style={{ padding: 10 }}>
    <div className="small" style={{ marginBottom: 6 }}>
      {pickupIsAirport && !dropoffIsAirport
  ? "Luggage details (Airport pickup)"
  : "Luggage details (Airport trip)"}
    </div>

    <input
      className="input"
      type="number"
      min={0}
      placeholder="🎒 Hand carry bags"
      value={handCarryBags}
      onChange={(e) => setHandCarryBags(e.target.value)}
    />

    <input
      className="input"
      type="number"
      min={0}
      placeholder="🧳 Check-in bags"
      value={checkInBags}
      onChange={(e) => setCheckInBags(e.target.value)}
      style={{ marginTop: 8 }}
    />
  </div>
)}

                <input
                  className="input"
                  placeholder="👤 Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <div className="phoneField">
                  <span className="phonePrefix">+61</span>
                  <input
                    className="input phoneInput"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="4xx xxx xxx"
                    value={phone}
                   onChange={(e) => {
  const raw = e.target.value.replace(/[^\d]/g, "");
  const normalized = raw.replace(/^0/, ""); // ✅ REMOVE leading 0

  setPhone(normalized);

  setOtp("");
  setOtpSent(false);
  setPhoneVerified(false);
  setOtpAttempts(0);
  setResendAfterFailCount(0);
}}


                    required
                  />
                </div>

                {/* ✅ OTP section */}
{!phoneVerified && (
  <div className="card" style={{ padding: 10, display: "grid", gap: 8 }}>
    {/* ✅ SHOW ERROR EVEN WHEN OTP NOT SENT */}
    {otpError && (
      <div className="small" style={{ color: "#ef4444" }}>
        {otpError}
      </div>
    )}

    {!otpSent ? (
      <button
        type="button"
        className="btn"
        onClick={sendOtp}
        disabled={otpLoading || resendTimer > 0}
      >
        {otpLoading
          ? "Sending OTP…"
          : resendTimer > 0
          ? `Resend OTP in ${resendTimer}s`
          : "Send OTP"}
      </button>
    ) : (
      <>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <button
            type="button"
            className="btn"
            onClick={verifyOtp}
            disabled={otpLoading}
          >
            {otpLoading ? "Verifying…" : "Verify OTP"}
          </button>
        </div>

       {otpInfo && (
  <div
    className="small"
    style={{
      color: "#facc15",
      fontWeight: 600,
    }}
  >
    {otpInfo}
  </div>
)}


{otpError && (
  <div className="small" style={{ color: "#ef4444" }}>
    {otpError}
  </div>
)}

{/* ✅ 60s TIMER DISPLAY */}
{resendTimer > 0 && (
  <div className="small" style={{ color: "#facc15" }}>
    ⏳ You can resend OTP in {resendTimer}s
  </div>
)}

{/* RESEND LOGIC */}
{resendTimer === 0 &&
  !isOtpBlocked() &&
  (otpAttempts < maxAttempts ||
    (otpAttempts >= maxAttempts && resendAfterFailCount === 0)) && (
    <button
      type="button"
      className="btn"
      onClick={sendOtp}
    >
      Resend OTP
    </button>
)}

{/* BLOCK MESSAGE */}
{resendTimer === 0 &&
  otpAttempts >= maxAttempts &&
  resendAfterFailCount >= 1 && (
    <>
      {setOtpBlock5Min()}
      <div className="small" style={{ color: "#ef4444" }}>
        ⛔ Too many attempts. Try again in 5 minutes.
      </div>
    </>
)}

      </>
    )}
  </div>
)}
{/* ✅ STEP 4 GOES EXACTLY HERE */}
{phoneVerified && (
  <div
    className="small"
    style={{
      color: "#facc15",
      marginTop: 6,
      fontWeight: 700,
    }}
  >
    ✔ Phone number verified
  </div>
)}

                <input
                  className="input"
                  type="email"
                  placeholder="📧 Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {/* Return trip */}
                <div className="card" style={{ padding: 10 }}>
                  <div className="small" style={{ marginBottom: 6 }}>
                    Need a return trip?
                  </div>

                  <div
                    className="radioRow"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <label
                      className="small"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <input
                        type="radio"
                        name="returnTrip"
                        checked={returnTrip === "No"}
                        onChange={() => setReturnTripSafe("No")}
                      />
                      No
                    </label>

                    <label
                      className="small"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <input
                        type="radio"
                        name="returnTrip"
                        checked={returnTrip === "Yes"}
                        onChange={() => setReturnTripSafe("Yes")}
                      />
                      Yes
                    </label>
                  </div>

                 {returnTrip === "Yes" && (
  <div className="grid cols-2" style={{ marginTop: 10, gap: 8 }}>
    <div>
      <div className="small">Return date (dd/mm/yyyy)</div>
      <input
        className="input"
        type="date"
        value={returnDate}
        onChange={(e) => setReturnDate(e.target.value)}
        required
      />
    </div>

    <div>
      <div className="small">Return time (hh:mm AM/PM)</div>
      <input
        className="input"
        type="time"
        value={returnTime}
        onChange={(e) => setReturnTime(e.target.value)}
        step="60"
        required
      />
    </div>
  </div>
)}


                </div>

                {/* ✅ NEW: Flight number UI */}
                {showFlightNumber && (
  <div className="card" style={{ padding: 10 }}>
    <div className="small" style={{ marginBottom: 6 }}>
      Flight details
    </div>

    {/* ✅ If return trip = YES → show ONLY return flight number */}
    {returnTrip === "Yes" ? (
      <input
        className="input"
        placeholder="Return flight number (e.g. VA123)"
        value={returnFlightNumber}
        onChange={(e) =>
          setReturnFlightNumber(e.target.value.toUpperCase())
        }
        required
      />
    ) : (
      /* ✅ If return trip = NO → show ONLY flight number */
      <input
        className="input"
        placeholder="Flight number (e.g. QF778)"
        value={flightNumber}
        onChange={(e) =>
          setFlightNumber(e.target.value.toUpperCase())
        }
        required
      />
    )}
  </div>
)}



                <textarea
                  className="input"
                  placeholder="Special request (optional)"
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  rows={3}
                />

              <button className="btn primary" type="submit" disabled={loading}>
                  {loading ? "Sending…" : "🚕 Request Booking"}
                </button>

                {msg && <div className="small">{msg}</div>}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>

       {/* ⭐ PREMIUM REVIEW BOOKING MODAL */}
{showReview && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(6px)",
      zIndex: 99998,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 22,
        padding: 26,
        maxWidth: 520,
        width: "100%",
        boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
      }}
    >
      <div
  style={{
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 14,
    color: "#111",   // ✅ ADD THIS
  }}
>
  🚕 Review your booking
</div>


      <div
        style={{
          background:
            "linear-gradient(135deg,#f5c04e,#d89b2b)",
          borderRadius: 16,
          padding: 18,
          marginBottom: 18,
          textAlign: "center",
          color: "#111",
          fontWeight: 700,
          fontSize: 26,
        }}
      >
        {pricingMode === "meter"
          ? `$${Number(meterLow ?? 0).toFixed(2)} – $${Number(
              meterHigh ?? 0
            ).toFixed(2)}`
          : fixedFare
          ? `$${Number(fixedFare).toFixed(2)}`
          : "—"}
      </div>

      <div style={{ lineHeight: 1.9, color: "#111", fontSize: 15 }}>

        <div>📍 <b>Pickup:</b> {pickup}</div>
        <div>🏁 <b>Dropoff:</b> {dropoff}</div>
        <div>
          🕐 <b>Date:</b>{" "}
          {when === "later" ? formatDateDMY(date) : "Today"}
        </div>
        <div>
          ⏰ <b>Time:</b>{" "}
          {when === "later" ? formatTimeAMPM(time) : "Now"}
        </div>
        <div>🚘 <b>Vehicle:</b> {carType}</div>
        {showLuggageFields && (
  <>
    <div>🧳 <b>Hand Carry:</b> {Number(handCarryBags || 0)}</div>
    <div>🧳 <b>Check-in Bags:</b> {Number(checkInBags || 0)}</div>
  </>
)}
      </div>

    {/* ⭐ BUTTON ROW */}
<div
  style={{
    display: "flex",
    gap: 14,
    marginTop: 28,
    width: "100%",
    alignItems: "stretch",
  }}
>
  {/* EDIT BUTTON */}
  <button
  type="button"
  className="btn"
  style={{
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 16,          // ⭐ force text visible
    fontWeight: 600,
    color: "#111",         // ⭐ override hidden color
    whiteSpace: "nowrap",
  }}
  onClick={() => setShowReview(false)}
>
  ✏️ Edit Details
</button>

  {/* CONFIRM BUTTON */}
  <button
  type="button"
  className="btn primary"
  style={{
    flex: 1,
    fontSize: 16,
    fontWeight: 600,
  }}
  onClick={() => {
    setShowReview(false);
    confirmSubmit();
  }}
>
  Confirm Booking
</button>

</div>


    </div>
  </div>
)}
    
    
    {/* ✅ STEP 3: CONFIRMATION MODAL (RIGHT HERE) */}
    {showConfirmation && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 28,
            maxWidth: 420,
            width: "100%",
            textAlign: "left",
          }}
        >
          <h1 style={{ color: "#16a34a", marginBottom: 10 }}>
  Booking Confirmed
</h1>

{/* ✅ ADD HERE */}
<div
  style={{
    background: "#facc15",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center"
  }}
>
  Booking ID: {bookingId || "Loading..."}
</div>

<p style={{ color: "#444", marginBottom: 20 }}>
  Your booking has been successfully created.
  We’ve sent confirmation details to your phone.
</p>

          <div style={{ fontSize: 28, marginBottom: 24 }}>
            📩 ➜ 📱 ✅
          </div>

          <button
            className="btn primary"
            style={{ width: "100%" }}
            onClick={() => {
              setShowConfirmation(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            OK
          </button>
        </div>
      </div>
        )}
  </>
);
}
