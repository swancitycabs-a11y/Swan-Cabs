import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Header from "./components/Header";
import Footer from "./components/Footer";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata = {
  title: "Swan Cabs",
  description: "A taxi service based out of Perth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Ads Global Tag */}
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-17703324537"></script>
<script
  dangerouslySetInnerHTML={{
    __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'AW-17703324537');
    `,
  }}
/>
        <meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1"
/>
        {/* Font Awesome */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>

      <body className={`${inter.variable} antialiased`}>
        {/* HEADER */}
        <Header />

        {/* PAGE CONTENT */}
        <main>{children}</main>

        {/* FOOTER */}
        <Footer />

        {/* Floating Buttons */}
        <a
          href="https://www.facebook.com/profile.php?id=61583388771900&mibextid=wwXIfr"
          className="messenger-button"
          target="_blank"
          rel="noreferrer"
        >
          <i className="fa-brands fa-facebook-messenger"></i>
        </a>

        <a
          href="https://www.instagram.com/"
          className="instagram-button"
          target="_blank"
          rel="noreferrer"
        >
          <i className="fa-brands fa-instagram"></i>
        </a>

        <a
          href="https://wa.me/61400757549"
          className="float"
          target="_blank"
          rel="noreferrer"
        >
          <i className="fa-brands fa-whatsapp my-float"></i>
        </a>
      </body>
    </html>
  );
}


