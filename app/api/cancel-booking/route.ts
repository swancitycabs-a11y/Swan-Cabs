import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch("https://hook.eu2.make.com/7cy51nu6xk6ht0fjti6ik2t1h3nw6k30", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // ✅ IMPORTANT: send status also
      body: JSON.stringify({
        bookingId: body.bookingId,
        status: "Cancelled",
      }),
    });

    // ✅ handle non-json safely
    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      ok: false,
      error: "Cancel failed",
    });
  }
}
