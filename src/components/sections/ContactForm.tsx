"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowIcon, CheckIcon } from "../ui/Icons";
import {
  ALLOWED_INTERESTS,
  ALLOWED_CONSULTATION_TYPES,
  ALLOWED_CONTACT_METHODS,
  ALLOWED_CALL_TIME_PREFERENCES,
  ALLOWED_PREFERRED_LANGUAGES,
  ALLOWED_SAVINGS_RANGES,
  GoalInterest,
  ConsultationType,
  ContactMethod,
  CallTimePreference,
  PreferredLanguage,
  SavingsRange,
  normalizeIndianPhone,
} from "@/lib/validations/lead";
import { subscribeToInterest } from "@/lib/interest-events";
import { getAttributionForSubmission } from "@/lib/utm";
import {
  createSubmissionSnapshot,
  submitLeadSnapshot,
  SubmissionSnapshot,
} from "@/lib/api-client";

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  consultationType?: string;
  interest?: string;
  contactMethod?: string;
  callTimePreference?: string;
  preferredLanguage?: string;
  city?: string;
  savingsRange?: string;
  consent?: string;
}

// Central configuration for WhatsApp direct link.
// When unconfigured, the button remains visible with reference styling but accessibly disabled.
const WHATSAPP_CONFIG_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || "";

export function ContactForm() {
  const [consultationType, setConsultationType] =
    useState<ConsultationType>("Savings plan consultation");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [interest, setInterest] = useState<GoalInterest | "">("");
  const [contactMethod, setContactMethod] =
    useState<ContactMethod>("Phone call");
  const [callTimePreference, setCallTimePreference] =
    useState<CallTimePreference>("No preference");
  const [preferredLanguage, setPreferredLanguage] =
    useState<PreferredLanguage>("English");
  const [city, setCity] = useState("");
  const [savingsRange, setSavingsRange] = useState<SavingsRange | "">("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const activeSnapshotRef = useRef<SubmissionSnapshot | null>(null);

  const containerRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const consultationTypeSelectRef = useRef<HTMLSelectElement>(null);
  const interestSelectRef = useRef<HTMLSelectElement>(null);
  const contactMethodFieldsetRef = useRef<HTMLFieldSetElement>(null);
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

        gsap.from(".consultation-cards-container", {
          y: 22,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".consultation-cards-container",
            start: "top 88%",
            once: true,
          },
        });

        gsap.from(".next-steps-card", {
          y: 20,
          opacity: 0,
          duration: 0.55,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: ".next-steps-card",
            start: "top 90%",
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

  // Field validation function
  const validateField = (
    field:
      | "name"
      | "phone"
      | "email"
      | "consultationType"
      | "interest"
      | "contactMethod"
      | "city"
      | "consent",
    val?: string | boolean
  ): string => {
    if (field === "name") {
      const v = typeof val === "string" ? val.trim() : name.trim();
      if (
        !/^[\p{L}\p{M}][\p{L}\p{M} .’'’-]*$/u.test(v) ||
        v.length < 2 ||
        v.length > 80
      ) {
        return "Enter a name with 2–80 characters.";
      }
    }

    if (field === "phone") {
      const v = typeof val === "string" ? val.trim() : phone.trim();
      const cleaned = normalizeIndianPhone(v);
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

    if (field === "consultationType") {
      const v = typeof val === "string" ? val : consultationType;
      if (!v || !ALLOWED_CONSULTATION_TYPES.includes(v as ConsultationType)) {
        return "Choose a valid type of consultation.";
      }
    }

    if (field === "interest") {
      const v = typeof val === "string" ? val : interest;
      if (!v || !ALLOWED_INTERESTS.includes(v as GoalInterest)) {
        return "Choose a goal for your consultation.";
      }
    }

    if (field === "contactMethod") {
      const v = typeof val === "string" ? val : contactMethod;
      if (v === "In person") {
        return "In-person consultation is not available. Please choose Phone call, WhatsApp, or Video call.";
      }
      if (!v || !ALLOWED_CONTACT_METHODS.includes(v as ContactMethod)) {
        return "Select your preferred contact method.";
      }
    }

    if (field === "city") {
      const v = typeof val === "string" ? val.trim() : city.trim();
      if (v.length > 80) {
        return "City must be 80 characters or fewer.";
      }
    }

    if (field === "consent") {
      const v = typeof val === "boolean" ? val : consent;
      if (!v) {
        return "Please agree to be contacted regarding your consultation.";
      }
    }

    return "";
  };

  const handleConsultationCardSelect = (type: ConsultationType) => {
    setConsultationType(type);
    activeSnapshotRef.current = null;
    if (errors.consultationType) {
      setErrors((prev) => ({ ...prev, consultationType: undefined }));
    }
    setStatusMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      consultationType: validateField("consultationType") || undefined,
      interest: validateField("interest") || undefined,
      contactMethod: validateField("contactMethod") || undefined,
      city: validateField("city") || undefined,
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
    if (newErrors.consultationType) {
      consultationTypeSelectRef.current?.focus();
      return;
    }
    if (newErrors.interest) {
      interestSelectRef.current?.focus();
      return;
    }
    if (newErrors.contactMethod) {
      contactMethodFieldsetRef.current?.focus();
      return;
    }
    if (newErrors.consent) {
      consentInputRef.current?.focus();
      return;
    }

    // Capture attribution safely
    const currentAttribution = getAttributionForSubmission() || undefined;

    // Check if existing active snapshot can be reused
    let snapshot = activeSnapshotRef.current;
    if (
      !snapshot ||
      snapshot.payload.name !== name.trim() ||
      snapshot.payload.phone !== phone.trim() ||
      snapshot.payload.email !== email.trim() ||
      snapshot.payload.consultationType !== consultationType ||
      snapshot.payload.interest !== interest ||
      snapshot.payload.contactMethod !== contactMethod ||
      snapshot.payload.callTimePreference !== callTimePreference ||
      snapshot.payload.preferredLanguage !== preferredLanguage ||
      snapshot.payload.city !== (city.trim() || undefined) ||
      snapshot.payload.savingsRange !== (savingsRange || undefined) ||
      snapshot.payload.consent !== consent
    ) {
      snapshot = createSubmissionSnapshot({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        consultationType,
        interest: interest as string,
        contactMethod,
        callTimePreference,
        preferredLanguage,
        city: city.trim() || undefined,
        savingsRange: savingsRange || undefined,
        consent,
        website: honeypot,
        attribution: currentAttribution,
      });
      activeSnapshotRef.current = snapshot;
    }

    setIsSubmitting(true);
    const result = await submitLeadSnapshot(snapshot);
    setIsSubmitting(false);

    if (result.success) {
      setIsSubmitted(true);
      setStatusMessage(result.message);
      activeSnapshotRef.current = null;
    } else {
      if (result.fields) {
        setErrors((prev) => ({ ...prev, ...result.fields }));
      }
      setStatusMessage(result.message);
    }
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

        {/* Client-Approved Offer Badge & Consultation Selection Cards */}
        <div className="consultation-cards-container">
          <div className="offer-badge-pill">
            Free consultation · For a limited time
          </div>
          <fieldset className="consultation-cards-group">
            <legend className="sr-only">Choose a type of consultation</legend>
            <div className="cards-grid">
              {/* Card 1: Quick call */}
              <button
                type="button"
                className={`consult-card ${
                  consultationType === "Quick call" ? "active" : ""
                }`}
                onClick={() => handleConsultationCardSelect("Quick call")}
                aria-pressed={consultationType === "Quick call"}
              >
                <div className="card-top">
                  <span className="card-title">Quick call</span>
                  {consultationType === "Quick call" && (
                    <span className="card-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </div>
                <p className="card-desc">
                  A brief call to answer your initial questions.
                </p>
                <span className="card-pill">Free for a limited time</span>
              </button>

              {/* Card 2: Savings plan consultation (Default) */}
              <button
                type="button"
                className={`consult-card ${
                  consultationType === "Savings plan consultation"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleConsultationCardSelect("Savings plan consultation")
                }
                aria-pressed={
                  consultationType === "Savings plan consultation"
                }
              >
                <div className="card-top">
                  <span className="card-title">
                    Savings plan consultation
                  </span>
                  {consultationType === "Savings plan consultation" && (
                    <span className="card-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </div>
                <p className="card-desc">
                  Explore fixed deposits, recurring deposits, and income plans
                  aligned with your goals.
                </p>
                <span className="card-pill">Free for a limited time</span>
              </button>

              {/* Card 3: Financial roadmap consultancy */}
              <button
                type="button"
                className={`consult-card ${
                  consultationType === "Financial roadmap consultancy"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleConsultationCardSelect("Financial roadmap consultancy")
                }
                aria-pressed={
                  consultationType === "Financial roadmap consultancy"
                }
              >
                <div className="card-top">
                  <span className="card-title">
                    Financial roadmap consultancy
                  </span>
                  {consultationType === "Financial roadmap consultancy" && (
                    <span className="card-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </div>
                <p className="card-desc">
                  A comprehensive discussion covering your milestones,
                  timelines, and goal-based savings structures.
                </p>
                <span className="card-pill">Free for a limited time</span>
              </button>
            </div>
          </fieldset>
        </div>

        {/* What Happens Next Card */}
        <div className="next-steps-card">
          <h3>What happens next</h3>
          <ol className="next-steps-list">
            <li>
              <span className="step-num">1</span>
              <span>We review your consultation request.</span>
            </li>
            <li>
              <span className="step-num">2</span>
              <span>A team member contacts you at a suitable time.</span>
            </li>
            <li>
              <span className="step-num">3</span>
              <span>Discuss your goals and explore relevant options.</span>
            </li>
          </ol>
        </div>

        {/* Main Two-Column Contact Layout */}
        <div className="contact-layout">
          <div className="contact-note">
            <h3>
              Start with what
              <br />
              matters to you.
            </h3>
            <ul className="checklist">
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

            {/* Confirmed Brand Card */}
            <div className="brand-trust-card">
              <div className="brand-avatar" aria-hidden="true">
                K2W
              </div>
              <div className="brand-info">
                <p className="brand-name">K2WFINANCE</p>
                <p className="brand-sub">Discuss your goals with our team</p>
                <p className="brand-note">
                  Your Partner in Financial Growth · Free consultation for a
                  limited time
                </p>
              </div>
            </div>

            {/* Safely Inactive WhatsApp Direct CTA */}
            <div className="direct-channel-box">
              <p className="direct-channel-text">
                Prefer to talk? Reach out through our direct consultation
                channels.
              </p>
              {WHATSAPP_CONFIG_NUMBER ? (
                <a
                  href={`https://wa.me/${WHATSAPP_CONFIG_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-btn active"
                >
                  Chat on WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  className="whatsapp-btn inactive"
                  aria-disabled="true"
                  title="WhatsApp consultation will be available once number is configured"
                  onClick={(e) => e.preventDefault()}
                >
                  Chat on WhatsApp
                </button>
              )}
            </div>
          </div>

          {/* Form */}
          <form id="lead-form" noValidate onSubmit={handleSubmit}>
            <p className="form-intro">
              Submit your details to request a consultation.
            </p>

            <div className="form-grid">
              {/* Full Name */}
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
                    activeSnapshotRef.current = null;
                    if (errors.name) {
                      setErrors((prev) => ({
                        ...prev,
                        name:
                          validateField("name", e.target.value) || undefined,
                      }));
                    }
                    setStatusMessage("");
                  }}
                />
                <span id="name-error" className="error">
                  {errors.name}
                </span>
              </div>

              {/* Indian Mobile Number */}
              <div className="field">
                <label htmlFor="phone">Indian mobile number *</label>
                <input
                  ref={phoneInputRef}
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  maxLength={18}
                  required
                  value={phone}
                  aria-invalid={!!errors.phone}
                  aria-describedby="phone-error"
                  onChange={(e) => {
                    setPhone(e.target.value);
                    activeSnapshotRef.current = null;
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

              {/* Email Address */}
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
                    activeSnapshotRef.current = null;
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

              {/* Type of Consultation (Synced with Cards) */}
              <div className="field">
                <label htmlFor="consultationType">
                  Type of consultation *
                </label>
                <select
                  ref={consultationTypeSelectRef}
                  id="consultationType"
                  name="consultationType"
                  required
                  value={consultationType}
                  aria-invalid={!!errors.consultationType}
                  aria-describedby="consultationType-error"
                  onChange={(e) => {
                    const val = e.target.value as ConsultationType;
                    setConsultationType(val);
                    activeSnapshotRef.current = null;
                    if (errors.consultationType) {
                      setErrors((prev) => ({
                        ...prev,
                        consultationType:
                          validateField("consultationType", val) || undefined,
                      }));
                    }
                    setStatusMessage("");
                  }}
                >
                  {ALLOWED_CONSULTATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span id="consultationType-error" className="error">
                  {errors.consultationType}
                </span>
              </div>

              {/* Goal / Interest Selection */}
              <div className="field">
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
                    activeSnapshotRef.current = null;
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

              {/* Preferred Contact Method (Radio Group - NO "In person") */}
              <fieldset
                ref={contactMethodFieldsetRef}
                className="field full method-fieldset"
                aria-invalid={!!errors.contactMethod}
                aria-describedby="method-error"
                tabIndex={-1}
              >
                <legend>How should we reach you? *</legend>
                <div className="method-radios">
                  {ALLOWED_CONTACT_METHODS.map((method) => (
                    <label
                      key={method}
                      className={`method-chip ${
                        contactMethod === method ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="contactMethod"
                        value={method}
                        checked={contactMethod === method}
                        onChange={() => {
                          setContactMethod(method);
                          activeSnapshotRef.current = null;
                          if (errors.contactMethod) {
                            setErrors((prev) => ({
                              ...prev,
                              contactMethod: undefined,
                            }));
                          }
                          setStatusMessage("");
                        }}
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
                <span id="method-error" className="error">
                  {errors.contactMethod}
                </span>
              </fieldset>

              {/* Best time to call (Optional) */}
              <div className="field">
                <label htmlFor="callTimePreference">Best time to call</label>
                <select
                  id="callTimePreference"
                  name="callTimePreference"
                  value={callTimePreference}
                  onChange={(e) => {
                    setCallTimePreference(
                      e.target.value as CallTimePreference
                    );
                    activeSnapshotRef.current = null;
                  }}
                >
                  {ALLOWED_CALL_TIME_PREFERENCES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Preferred language (Optional) */}
              <div className="field">
                <label htmlFor="preferredLanguage">Preferred language</label>
                <select
                  id="preferredLanguage"
                  name="preferredLanguage"
                  value={preferredLanguage}
                  onChange={(e) => {
                    setPreferredLanguage(
                      e.target.value as PreferredLanguage
                    );
                    activeSnapshotRef.current = null;
                  }}
                >
                  {ALLOWED_PREFERRED_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              {/* City (Optional) */}
              <div className="field">
                <label htmlFor="city">City (optional)</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="e.g. Bengaluru, Mumbai"
                  maxLength={80}
                  value={city}
                  aria-invalid={!!errors.city}
                  aria-describedby="city-error"
                  onChange={(e) => {
                    setCity(e.target.value);
                    activeSnapshotRef.current = null;
                    if (errors.city) {
                      setErrors((prev) => ({
                        ...prev,
                        city:
                          validateField("city", e.target.value) || undefined,
                      }));
                    }
                  }}
                />
                <span id="city-error" className="error">
                  {errors.city}
                </span>
              </div>

              {/* Monthly Savings Range (Optional) */}
              <div className="field">
                <label htmlFor="savingsRange">
                  Monthly savings range (optional)
                </label>
                <select
                  id="savingsRange"
                  name="savingsRange"
                  value={savingsRange}
                  onChange={(e) => {
                    setSavingsRange(e.target.value as SavingsRange | "");
                    activeSnapshotRef.current = null;
                  }}
                >
                  <option value="">Choose a range</option>
                  {ALLOWED_SAVINGS_RANGES.map((range) => (
                    <option key={range} value={range}>
                      {range}
                    </option>
                  ))}
                </select>
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

            {/* Explicit Contact Consent Checkbox (No Privacy/Terms links) */}
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
                  activeSnapshotRef.current = null;
                  if (errors.consent) {
                    setErrors((prev) => ({
                      ...prev,
                      consent:
                        validateField("consent", e.target.checked) ||
                        undefined,
                    }));
                  }
                  setStatusMessage("");
                }}
              />
              <span>
                I agree to be contacted by K2WFINANCE regarding my consultation
                request. *
              </span>
            </label>
            <span className="error" id="consent-error">
              {errors.consent}
            </span>

            <button
              type="submit"
              className="btn primary"
              disabled={isSubmitting || isSubmitted}
            >
              {isSubmitting ? (
                "Submitting request..."
              ) : isSubmitted ? (
                "Request submitted"
              ) : (
                <>
                  Request consultation <ArrowIcon />
                </>
              )}
            </button>

            {statusMessage && (
              <div className="form-status" id="form-status" role="status">
                {statusMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
