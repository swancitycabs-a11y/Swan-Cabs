"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Header() {
  const phoneDisplay = "(+61) 400757549";
  const phoneTel = "+61400757549";

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className={`siteHeader ${scrolled ? "isScrolled" : ""}`}>
      {/* Backdrop */}
      {menuOpen && (
        <div
          className="menuBackdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="container headerInner">
        {/* Brand */}
        <Link href="/" className="brandBlock" onClick={() => setMenuOpen(false)}>
          <div className="brandName">Swan Cabs</div>
          <div className="brandTag">Available 24/7</div>
        </Link>

        {/* ACTION BUTTONS (NEW) */}
        <div className="headerActions">
          {/* Call Now */}
          <a
            className="headerPhone callNowBtn"
            href={`tel:${phoneTel}`}
          >
            📞 Call Now
          </a>

          {/* Manage Booking */}
         <Link href="/manage-booking" className="headerPhone callNowBtn manageStack">
  <span className="manageTop">📋 Manage</span>
  <span className="manageBottom">  Booking</span>
</Link>
        </div>

        {/* Burger */}
        <button
          type="button"
          className="hamburger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Desktop nav */}
        <nav className="headerNav">
          <Link href="/">Home</Link>
          <Link href="/book">Book Taxi</Link>
          <Link href="/#services">Services</Link>
          <Link href="/#contact">Contact</Link>
        </nav>

        {/* Mobile nav */}
        {menuOpen && (
          <nav className="mobileMenu">
            <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link href="/book" onClick={() => setMenuOpen(false)}>Book Taxi</Link>
            <Link href="/manage-booking" onClick={() => setMenuOpen(false)}>Manage Booking</Link>
            <Link href="/#services" onClick={() => setMenuOpen(false)}>Services</Link>
            <Link href="/#contact" onClick={() => setMenuOpen(false)}>Contact</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
