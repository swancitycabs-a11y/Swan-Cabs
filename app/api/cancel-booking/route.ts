import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    const res = await fetch("https://hook.eu2.make.com/7cy51nu6xk6ht0fjti6ik2t1h3nw6k30", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    });

    const data = await res.json();

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false });
  }
}
