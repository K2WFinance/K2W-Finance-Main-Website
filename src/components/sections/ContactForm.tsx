"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowIcon, CheckIcon } from "../ui/Icons";
import {
  ALLOWED_INTERESTS,
  GoalInterest,
  subscribeToInterest,
} from "@/lib/interest-events";

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  interest?: string;
  consent?: string;
}

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<GoalInterest | "">("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const containerRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const interestSelectRef = useRef<HTMLSelectElement>(null);
  const consentInputRef = useRef<HTMLInputElement>(null);

  // Scroll-reveal animation for Contact section
  useEffect(() => {
    const root = containerRef.current;
    if (typeof window === "undefined" || !root) return;

    gsap.registerPlugin(ScrollTrigger);

    const mm = gsap.matchMedia();

    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from(".contact-heading > *", {
          y: 20,
          opacity: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".contact-heading",
            start: "top 88%",
            once: true,
          },
        });

        gsap.from(".contact-note", {
          y: 22,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".contact-layout",
            start: "top 86%",
            once: true,
          },
        });

        gsap.from("#lead-form", {
          y: 24,
          opacity: 0,
          duration: 0.65,
          delay: 0.08,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".contact-layout",
            start: "top 86%",
            once: true,
          },
        });
      },
      root
    );

    return () => {
      mm.revert();
    };
  }, []);

  // Subscribe to external goal / savings-option preselection
  useEffect(() => {
    const unsubscribe = subscribeToInterest((newInterest) => {
      setInterest(newInterest);
      setErrors((prev) => ({ ...prev, interest: undefined }));
      setStatusMessage("");
    });
    return unsubscribe;
  }, []);

  // Validation function
  const validateField = (
    field: "name" | "phone" | "email" | "interest" | "consent",
    val?: string | boolean
  ): string => {
    if (field === "name") {
      const v = typeof val === "string" ? val.trim() : name.trim();
      if (!/^[\p{L}\p{M}][\p{L}\p{M} .’'’-]*$/u.test(v) || v.length < 2 || v.length > 80) {
        return "Enter a name with 2–80 characters.";
      }
    }

    if (field === "phone") {
      const v = typeof val === "string" ? val.trim() : phone.trim();
      const cleaned = v.replace(/[\s()-]/g, "").replace(/^(\+91|0091)/, "");
      if (!/^[6-9]\d{9}$/.test(cleaned)) {
        return "Enter a valid 10-digit Indian mobile number.";
      }
    }

    if (field === "email") {
      const v = typeof val === "string" ? val.trim() : email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.length > 254) {
        return "Enter a valid email address.";
      }
    }

    if (field === "interest") {
      const v = typeof val === "string" ? val : interest;
      if (!v || !ALLOWED_INTERESTS.includes(v as GoalInterest)) {
        return "Choose a goal for your consultation.";
      }
    }

    if (field === "consent") {
      const v = typeof val === "boolean" ? val : consent;
      if (!v) {
        return "Please acknowledge that this is a demo.";
      }
    }

    return "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");

    // Honeypot check
    if (honeypot) {
      return;
    }

    const newErrors: FormErrors = {
      name: validateField("name") || undefined,
      phone: validateField("phone") || undefined,
      email: validateField("email") || undefined,
      interest: validateField("interest") || undefined,
      consent: validateField("consent") || undefined,
    };

    setErrors(newErrors);

    // Focus first invalid field
    if (newErrors.name) {
      nameInputRef.current?.focus();
      return;
    }
    if (newErrors.phone) {
      phoneInputRef.current?.focus();
      return;
    }
    if (newErrors.email) {
      emailInputRef.current?.focus();
      return;
    }
    if (newErrors.interest) {
      interestSelectRef.current?.focus();
      return;
    }
    if (newErrors.consent) {
      consentInputRef.current?.focus();
      return;
    }

    // Success (demo mode only - no API call, no PII stored)
    setStatusMessage(
      "Demo validation complete. No information was sent or saved. Your consultation has not been booked."
    );
  };

  return (
    <section ref={containerRef} className="contact-section" id="contact">
      <div className="wrap">
        <div className="contact-heading">
          <h2>
            Your next chapter starts
            <br />
            with a conversation.
          </h2>
          <p>
            A home. A family milestone. More freedom after work. Tell us what
            you’re working towards.
          </p>
        </div>

        <div className="contact-layout">
          <div className="contact-note">
            <h3>
              Start with what
              <br />
              matters to you.
            </h3>
            <ul>
              <li>
                <CheckIcon />
                <span>Your goals and timeline</span>
              </li>
              <li>
                <CheckIcon />
                <span>Your monthly savings comfort</span>
              </li>
              <li>
                <CheckIcon />
                <span>Your questions, in plain language</span>
              </li>
            </ul>
            <p className="demo">
              Design preview. Consultation booking is not connected. Please use
              sample details in the demo form.
            </p>
          </div>

          <form id="lead-form" noValidate onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="name">Full name *</label>
                <input
                  ref={nameInputRef}
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  maxLength={80}
                  required
                  value={name}
                  aria-invalid={!!errors.name}
                  aria-describedby="name-error"
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({
                        ...prev,
                        name: validateField("name", e.target.value) || undefined,
                      }));
                    }
                    setStatusMessage("");
                  }}
                />
                <span id="name-error" className="error">
                  {errors.name}
                </span>
              </div>

              <div className="field">
                <label htmlFor="phone">Indian mobile number *</label>
                <input
                  ref={phoneInputRef}
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  maxLength={18}
                  required
                  value={phone}
                  aria-invalid={!!errors.phone}
                  aria-describedby="phone-error"
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) {
                      setErrors((prev) => ({
                        ...prev,
                        phone:
                          validateField("phone", e.target.value) || undefined,
                      }));
                    }
                    setStatusMessage("");
                  }}
                />
                <span id="phone-error" className="error">
                  {errors.phone}
                </span>
              </div>

              <div className="field">
                <label htmlFor="email">Email address *</label>
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={254}
                  required
                  value={email}
                  aria-invalid={!!errors.email}
                  aria-describedby="email-error"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({
                        ...prev,
                        email:
                          validateField("email", e.target.value) || undefined,
                      }));
                    }
                    setStatusMessage("");
                  }}
                />
                <span id="email-error" className="error">
                  {errors.email}
                </span>
              </div>

              <div className="field full">
                <label htmlFor="interest">
                  What would you like to plan for? *
                </label>
                <select
                  ref={interestSelectRef}
                  id="interest"
                  name="interest"
                  required
                  value={interest}
                  aria-invalid={!!errors.interest}
                  aria-describedby="interest-error"
                  onChange={(e) => {
                    const val = e.target.value as GoalInterest | "";
                    setInterest(val);
                    if (errors.interest) {
                      setErrors((prev) => ({
                        ...prev,
                        interest:
                          validateField("interest", val) || undefined,
                      }));
                    }
                    setStatusMessage("");
                  }}
                >
                  <option value="">Choose your goal</option>
                  {ALLOWED_INTERESTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <span id="interest-error" className="error">
                  {errors.interest}
                </span>
              </div>
            </div>

            {/* Hidden Honeypot */}
            <div className="hp" aria-hidden="true">
              <label htmlFor="website">Leave this blank</label>
              <input
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <label className="consent" htmlFor="consent">
              <input
                ref={consentInputRef}
                id="consent"
                type="checkbox"
                required
                checked={consent}
                aria-invalid={!!errors.consent}
                aria-describedby="consent-error"
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (errors.consent) {
                    setErrors((prev) => ({
                      ...prev,
                      consent:
                        validateField("consent", e.target.checked) || undefined,
                    }));
                  }
                  setStatusMessage("");
                }}
              />
              <span>
                I understand this is a demo form and no information will be sent
                or saved. *
              </span>
            </label>
            <span className="error" id="consent-error">
              {errors.consent}
            </span>

            <button type="submit" className="btn primary">
              Preview my request <ArrowIcon />
            </button>

            {statusMessage && (
              <div className="form-status" id="form-status" role="status">
                {statusMessage}
              </div>
            )}

            <p className="demo">
              UI demo only. No information is sent or saved. Please use sample
              details.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
