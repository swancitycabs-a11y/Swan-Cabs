export default function Testimonials() {
  return (
    <section id="testimonials" className="section">
      <div className="container">
        <h2>Customer reviews</h2>
        <p className="lead">Real feedback from riders around Perth.</p>

        <div className="grid cols-3">
          <div className="card">
            <div style={{ fontWeight: 800 }}>“Super quick pickup”</div>
            <p className="small">Driver arrived fast and the car was spotless.</p>
            <div className="small">— Sarah</div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 800 }}>“Maxi was perfect”</div>
            <p className="small">We had 6 people + luggage. Plenty of space.</p>
            <div className="small">— James</div>
          </div>
          <div className="card">
            <div style={{ fontWeight: 800 }}>“Great airport transfer”</div>
            <p className="small">On time and stress-free pickup from the airport.</p>
            <div className="small">— Amina</div>
          </div>
        </div>
      </div>
    </section>
  );
}
