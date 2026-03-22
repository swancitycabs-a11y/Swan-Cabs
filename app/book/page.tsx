import BookingForm from "../components/BookingForm";

export default function BookPage() {
  return (
    <>
      {/* BOOKING CARD ONLY */}
      <section className="sectionTight">
        <div className="bookingForm">
          <BookingForm />
        </div>
      </section>
    </>
  );
}
