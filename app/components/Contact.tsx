import Link from "next/link";

export default function Contact() {
  return (
    <section id="contact" className="section">
      <div className="container">
        <div className="grid cols-2" style={{ alignItems: "start" }}>
          <div>
            <h2>Contact</h2>
            <p className="lead">
              Want to book by phone or ask a question? Reach out anytime.
            </p>

            <div className="card">
              <div style={{ fontWeight: 800 }}>Phone</div>
              <div style={{ marginTop: 6 }}>+61 400 757 549</div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 800, marginBottom: 10 }}>
              Quick actions
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="btn primary" href="/book">
                Book now
              </Link>

              <a className="btn" href="mailto:swancitycabs@gmail.com">
                Email us
              </a>

              <a
                className="btn"
                href="https://wa.me/61400757549"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

