import { NextResponse } from "next/server";
import twilio from "twilio";

const MAX_BODY_BYTES = 2_048;

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const { phone: rawPhone, code: rawCode } = await req.json();
    const phone = String(rawPhone || "").trim();
    const code = String(rawCode || "").trim();

    if (!/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{4,10}$/.test(code)) {
      return NextResponse.json({ verified: false, error: "Invalid verification request" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!accountSid || !authToken || !serviceSid) {
      console.error("Twilio Verify environment variables are missing");
      return NextResponse.json({ error: "Verification service unavailable" }, { status: 503 });
    }

    const client = twilio(accountSid, authToken);
    const check = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: phone, code });

    if (check.status === "approved") return NextResponse.json({ verified: true });
    return NextResponse.json({ verified: false }, { status: 400 });
  } catch (error) {
    console.error("OTP verification failed", error);
    return NextResponse.json({ error: "Unable to verify code" }, { status: 500 });
  }
}
