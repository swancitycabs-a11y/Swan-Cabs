import Banner from "./components/Banner";
import BookingForm from "./components/BookingForm";
import Services from "./components/Services";
import Testimonials from "./components/Testimonials";
import Contact from "./components/Contact";
import MobileRedirect from "./components/MobileRedirect";

export default function Home() {
  return (
    <>
      <MobileRedirect />

      <Banner />

      {/* Desktop-only booking */}
      <div className="hidden md:block" id="booking-form">
        <BookingForm />
      </div>

      <Services />
      <Testimonials />
      <Contact />
    </>
  );
}

