import { NextResponse } from "next/server";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();

    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!) // ✅ fixed
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (check.status === "approved") {
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
