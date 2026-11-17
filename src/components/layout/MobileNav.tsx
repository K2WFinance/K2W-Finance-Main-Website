"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    document.body.style.overflow = "";
    menuButtonRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    setIsOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Focus management when drawer opens
  useEffect(() => {
    if (isOpen) {
      const firstLink = drawerRef.current?.querySelector<HTMLAnchorElement>("a");
      firstLink?.focus();
    }
  }, [isOpen]);

  // Keyboard trap and Escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }

      if (e.key === "Tab" && drawerRef.current && menuButtonRef.current) {
        const links = Array.from(
          drawerRef.current.querySelectorAll<HTMLAnchorElement>("a")
        );
        const focusable = [menuButtonRef.current, ...links];
        const active = document.activeElement;

        if (e.shiftKey && active === focusable[0]) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!e.shiftKey && active === focusable[focusable.length - 1]) {
          e.preventDefault();
          focusable[0].focus();
        }
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 820) {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, closeMenu]);

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        className="menu"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-controls="mobile-nav"
        aria-expanded={isOpen}
        onClick={toggleMenu}
      >
        Menu
      </button>

      <div
        id="mobile-nav"
        ref={drawerRef}
        className={`mobile-nav ${isOpen ? "open" : ""}`.trim()}
        hidden={!isOpen}
      >
        <Link href="#goals" onClick={closeMenu}>
          Your goals
        </Link>
        <Link href="#solutions" onClick={closeMenu}>
          Savings options
        </Link>
        <Link href="#process" onClick={closeMenu}>
          Our approach
        </Link>
        <Link href="#faqs" onClick={closeMenu}>
          FAQs
        </Link>
        <Link href="#contact" onClick={closeMenu}>
          Let’s talk
        </Link>
      </div>
    </>
  );
}
