export default function FloatingButtons() {
  return (
    <>
      {/* Facebook Messenger */}
      <a
        href="https://www.facebook.com/"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-36 right-4 z-50 bg-blue-600 p-4 rounded-full shadow-lg text-white"
      >
        <i className="fa-brands fa-facebook-messenger text-2xl"></i>
      </a>

      {/* Instagram */}
      <a
        href="https://www.instagram.com/"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 right-4 z-50 bg-pink-500 p-4 rounded-full shadow-lg text-white"
      >
        <i className="fa-brands fa-instagram text-2xl"></i>
      </a>

      {/* WhatsApp */}
      <a
        href="https://wa.me/61436110488"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-10 right-4 z-50 bg-green-500 p-4 rounded-full shadow-lg text-white"
      >
        <i className="fa-brands fa-whatsapp text-2xl"></i>
      </a>
    </>
  );
}
