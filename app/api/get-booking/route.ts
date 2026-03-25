import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { bookingId } = await req.json();

    const res = await fetch("https://hook.eu2.make.com/0d84io4o9k5m3gj0k3sta7dpqh6t5b6l", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      booking: data,
    });
  } catch (err) {
    return NextResponse.json({ ok: false });
  }
}
