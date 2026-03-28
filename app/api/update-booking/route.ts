import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch("https://hook.eu2.make.com/w8t9wvsf9ibdfn3vge9m2njle6rswh9p", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "updateBooking", // ⭐ CRITICAL FIX
        ...body,
   }),
    });

    // ⚠️ IMPORTANT: handle non-json safely
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
      error: "Server error",
    });
  }
}
