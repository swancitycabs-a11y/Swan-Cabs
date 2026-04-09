"use client";

import { usePathname } from "next/navigation";

export default function Banner() {
  const pathname = usePathname();

  // ❌ Do not show banner on booking page
  if (pathname === "/book") return null;

  return (
    <section className="section">
      <div className="container">
        <div className="grid cols-2" style={{ alignItems: "center" }}>
          <div>
            <div className="badge">🚕 Perth Airport • City • FIFO • 24/7</div>

            <h1
              style={{
                margin: "14px 0 10px",
                fontSize: 44,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              Premium Taxi Bookings in Perth — in seconds.
            </h1>

            <p className="lead">
              Upfront estimate, reliable drivers, clean vehicles. Choose
              Standard, Baby Seats, Maxi Cabs, or Wheelchair access.
            </p>

            {/* MOBILE CTA */}
            <div className="mobileCtaWrap">
              <div className="ctaRow ctaRowNoWrap">
                <a href="#book" className="btn primary">
                  Book a taxi
                </a>

                <a href="tel:+61429526826" className="btn primary">
                  Call
                </a>

                <a
                  className="btn primary"
                  href={
                    "sms:+61429526826?&body=" +
                    encodeURIComponent("Hi, I’d like to book a taxi.")
                  }
                >
                  Text
                </a>

                <a href="#services" className="btn">
                  See services
                </a>
              </div>
            </div>

            <div style={{ marginTop: 14 }} className="small">
              Tip: Airport fee applies only when pickup is from the airport.
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 10 }}>
              Why people choose us
            </div>

            <div className="grid" style={{ gap: 10 }}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700 }}>Fast pickup</div>
                <div className="small">
                  Faster pickups across Perth metro.
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700 }}>
                  Baby Seats, Maxi & Wheelchair
                </div>
                <div className="small">
                  Extra options when you need them.
                </div>
              </div>

              <div className="card" style={{ padding: 14 }}>
                <div style={{ fontWeight: 700 }}>
                  Card payments & CabCharge
                </div>
                <div className="small">
                  Credit card & CabCharge supported for bookings.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

