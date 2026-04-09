export default function Services() {
  return (
    <section id="services" className="section">
      <div className="container">
        <h2>Services</h2>
        <p className="lead">From airport transfers to group travel — choose what fits.</p>

        <div className="grid cols-3">
          <div className="card">
            <div style={{ fontWeight: 800 }}>Airport Transfers</div>
            <p className="small">Perth Airport pickups & drop-offs. Meet & greet available.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 800 }}>Maxi Cab Service</div>
            <p className="small">Ideal for groups, extra luggage, events, and larger travel needs.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 800 }}> Baby Seat / Wheelchair Cab</div>
            <p className="small">Accessible rides with extra assistance options.</p>
          </div>
        </div>

        <hr className="hr" />

        <div id="how" className="grid cols-3">
          <div className="card">
            <div style={{ fontWeight: 800 }}>1) Enter route</div>
            <p className="small">Pickup + drop-off locations.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 800 }}>2) Choose taxi</div>
            <p className="small">Standard / Baby Seat / Maxi / Wheelchair.</p>
          </div>
          <div className="card">
            <div style={{ fontWeight: 800 }}>3) Confirm</div>
            <p className="small">We will send you confirmation by Text.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
