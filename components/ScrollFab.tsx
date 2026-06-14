"use client";

import { useEffect, useState } from "react";

// Botón flotante que alterna: arriba → baja al final; tras desplazarse → sube al inicio.
export default function ScrollFab() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleClick() {
    window.scrollTo({
      top: scrolled ? 0 : document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={scrolled ? "Ir al inicio" : "Ir al final"}
      title={scrolled ? "Ir al inicio" : "Ir al final"}
      className="fixed bottom-6 right-4 z-30 grid h-11 w-11 place-items-center rounded-full bg-pitch text-white shadow-lg transition-colors hover:bg-pitch-dark"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform ${scrolled ? "" : "rotate-180"}`}
      >
        <path d="M6 15l6-6 6 6" />
      </svg>
    </button>
  );
}
