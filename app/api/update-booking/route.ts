import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const booking = await req.json();

    const res = await fetch("https://hook.eu2.make.com/w8t9wvsf9ibdfn3vge9m2njle6rswh9p", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(booking),
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
