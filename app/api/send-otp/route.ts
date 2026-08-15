import Twilio from "twilio";
import { NextResponse } from "next/server";

const MAX_BODY_BYTES = 2_048;

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const body = await req.json();
    const phone = String(body?.phone || "").trim();

    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!accountSid || !authToken || !serviceSid) {
      console.error("Twilio Verify environment variables are missing");
      return NextResponse.json({ error: "Verification service unavailable" }, { status: 503 });
    }

    const client = Twilio(accountSid, authToken);
    const verification = await client.verify.v2.services(serviceSid).verifications.create({
      to: phone,
      channel: "sms",
    });

    return NextResponse.json({ status: verification.status });
  } catch (err) {
    console.error("OTP send failed", err);
    return NextResponse.json({ error: "Unable to send verification code" }, { status: 500 });
  }
}
