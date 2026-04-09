export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "30px 0 40px" }}>
      <div className="container">
        <div className="grid cols-2" style={{ alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800 }}>Swan City Cabs</div>

            <div className="small" style={{ marginTop: 6 }}>
              © {new Date().getFullYear()} Swan Cabs. All rights reserved.
            </div>

            {/* ✅ ADD THIS LINE */}
            <div className="small" style={{ marginTop: 6, fontSize: "11px", opacity: 0.7 }}>
              Swan Cabs is an independent taxi service and is not affiliated with Swan Taxis or any other Serivices.
            </div>

          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 14 }}>
            <a className="small" href="#services">Services</a>
            <a className="small" href="#testimonials">Reviews</a>
            <a className="small" href="#contact">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
