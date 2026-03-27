"use client";

import { useState, useEffect } from "react";

type BillingCycle = "monthly" | "annual";
type PaymentState = "idle" | "submitting" | "success" | "error";

interface BillingStatus {
  subscriptionStatus?: "active" | "pending" | "inactive";
  plan?: "monthly" | "annual";
  activeUntil?: string;
}

const FREE_FEATURES = [
  { label: "Opportunity Inbox (unlimited scraping)", included: true },
  { label: "Application Tracker (Kanban board)", included: true },
  { label: "Analytics dashboard (basic)", included: true },
  { label: "1 resume upload", included: true },
  { label: "3 AI resume analyses/month", included: true },
  { label: "3 AI cover letters/month", included: true },
  { label: "2 cold outreach emails/month", included: true },
  { label: "Tailored resume generation", included: false },
  { label: "Automation pipeline", included: false },
  { label: "Multiple search profiles", included: false },
];

const PRO_FEATURES = [
  { label: "Everything in Free" },
  { label: "Unlimited AI resume analyses" },
  { label: "Unlimited cover letter generation" },
  { label: "Unlimited cold outreach emails" },
  { label: "Tailored resume generation (LaTeX + PDF)" },
  { label: "Full automation pipeline" },
  { label: "Multiple search profiles" },
  { label: "Full analytics with trends" },
  { label: "Priority support" },
];

const FAQ_ITEMS = [
  {
    q: "How quickly will I be activated?",
    a: "Within 1 hour during business hours (9am–10pm IST). If you submit outside these hours, you'll be activated first thing the next morning.",
  },
  {
    q: "What payment methods are accepted?",
    a: "Any UPI app: PhonePe, Google Pay, Paytm, BHIM, or any bank UPI app. Scan the QR code or use the UPI ID directly.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes, within 7 days if you haven't used any Pro features. Email us with your transaction ID and we'll process the refund within 24 hours.",
  },
  {
    q: "Will I get an invoice?",
    a: "Yes, we'll email you a receipt after activation. It will include your transaction details and subscription period.",
  },
  {
    q: "What happens when my subscription expires?",
    a: "You keep free tier access. Your data is never deleted — all your applications, resumes, and history are preserved.",
  },
];

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-4 w-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [showPayment, setShowPayment] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [paymentError, setPaymentError] = useState("");
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [qrError, setQrError] = useState(false);

  const upiId = process.env.NEXT_PUBLIC_UPI_ID ?? "";

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setBillingStatus(data);
      })
      .catch(() => {});
  }, []);

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!transactionId.trim()) return;
    setPaymentState("submitting");
    setPaymentError("");
    try {
      const res = await fetch("/api/billing/upi-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: transactionId.trim(), plan: billing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPaymentState("error");
        setPaymentError(data?.error ?? "Something went wrong. Please try again.");
      } else {
        setPaymentState("success");
      }
    } catch {
      setPaymentState("error");
      setPaymentError("Network error. Please check your connection and try again.");
    }
  }

  function formatActiveUntil(dateStr?: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const priceMonthly = billing === "monthly" ? "₹499/mo" : "₹3,999/yr";
  const amountDisplay = billing === "monthly" ? "₹499/month" : "₹3,999/year";

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">

        {/* Current plan banner */}
        {billingStatus?.subscriptionStatus === "active" && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm text-green-800">
            <span className="text-base">✅</span>
            <span>
              You&apos;re on Pro ({billingStatus.plan ?? "monthly"})
              {billingStatus.activeUntil && (
                <> · Active until {formatActiveUntil(billingStatus.activeUntil)}</>
              )}
            </span>
            <button className="ml-auto text-green-700 underline hover:text-green-900 font-medium">
              Manage
            </button>
          </div>
        )}

        {billingStatus?.subscriptionStatus === "pending" && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm text-amber-800">
            <span className="text-base">⏳</span>
            <span>Payment pending verification · Usually within 1 hour</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            Simple, honest pricing
          </h1>
          <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
            Start free. Upgrade when you&apos;re ready.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm font-medium ${billing === "monthly" ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBilling(billing === "monthly" ? "annual" : "monthly")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
              billing === "annual" ? "bg-brand-600" : "bg-gray-200"
            }`}
            role="switch"
            aria-checked={billing === "annual"}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                billing === "annual" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billing === "annual" ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>
            Annual
          </span>
          {billing === "annual" && (
            <span className="rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5">
              Save 33%
            </span>
          )}
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Free card */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700 p-8 flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Free</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">₹0</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">No credit card required.</p>
            </div>

            <ul className="space-y-3 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  {f.included ? (
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <XIcon className="h-3 w-3" />
                    </span>
                  )}
                  <span className={`text-sm ${f.included ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <div className="w-full rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 px-4 py-2.5 text-center text-sm font-medium text-gray-500">
                Current plan
              </div>
            </div>
          </div>

          {/* Pro card */}
          <div className="rounded-2xl border-2 border-brand-500 bg-white dark:bg-gray-900 p-8 flex flex-col relative shadow-lg shadow-brand-100 dark:shadow-none">
            {/* Most popular badge */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-brand-600 text-white text-xs font-semibold px-4 py-1">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Pro</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                  {billing === "monthly" ? "₹499" : "₹3,999"}
                </span>
                <span className="text-gray-500 text-sm">
                  {billing === "monthly" ? "/month" : "/year"}
                </span>
              </div>
              {billing === "annual" && (
                <p className="mt-1 text-sm text-green-600 font-medium">₹333/month — save ₹999/year</p>
              )}
              <p className="mt-2 text-sm text-gray-500">Everything you need to land your next role.</p>
            </div>

            <ul className="space-y-3 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{f.label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              {billingStatus?.subscriptionStatus === "active" ? (
                <div className="w-full rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-center text-sm font-medium text-green-700">
                  Active plan
                </div>
              ) : billingStatus?.subscriptionStatus === "pending" ? (
                <div className="w-full rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-center text-sm font-medium text-amber-700">
                  Activation pending...
                </div>
              ) : (
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>

        {/* UPI Payment section */}
        {showPayment && (
          <div className="mb-10 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 max-w-lg mx-auto shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pay via UPI</h3>
              <button
                onClick={() => { setShowPayment(false); setPaymentState("idle"); setTransactionId(""); setPaymentError(""); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {paymentState === "success" ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <CheckIcon className="h-7 w-7 text-green-600" />
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-medium">
                  We&apos;ve received your payment claim.
                </p>
                <p className="text-sm text-gray-500">
                  You&apos;ll be activated within 1 hour. Check back soon!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="space-y-5">
                {/* Amount */}
                <div className="rounded-lg bg-brand-50 dark:bg-brand-950 border border-brand-100 dark:border-brand-800 px-4 py-3 text-center">
                  <span className="text-sm text-brand-600 dark:text-brand-400 font-medium">Amount: </span>
                  <span className="text-lg font-bold text-brand-700 dark:text-brand-300">{amountDisplay}</span>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                    <div className="relative h-48 w-48">
                      {qrError ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-400 text-center px-2">
                          QR not configured<br />Use UPI ID below
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/upi-qr.png"
                          alt="UPI QR Code"
                          className="h-full w-full object-contain"
                          onError={() => setQrError(true)}
                        />
                      )}
                    </div>
                  </div>

                  {/* UPI ID */}
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">UPI ID</p>
                    <p className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">
                      {upiId || "Pay via QR code above"}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400">
                    Scan with PhonePe · GPay · Paytm · BHIM
                  </p>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">After paying</span>
                  </div>
                </div>

                {/* Transaction ID input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Transaction ID
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 415382748492"
                    required
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {paymentState === "error" && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {paymentError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={paymentState === "submitting" || !transactionId.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {paymentState === "submitting" ? (
                    <>
                      <Spinner />
                      Submitting…
                    </>
                  ) : (
                    <>Submit Payment →</>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
                  <span>ℹ️</span>
                  You&apos;ll be activated within 1 hour
                </p>
              </form>
            )}
          </div>
        )}

        {/* Pricing toggle to show payment when not shown */}
        {!showPayment && billingStatus?.subscriptionStatus !== "active" && billingStatus?.subscriptionStatus !== "pending" && (
          <div className="text-center mb-10">
            <button
              onClick={() => setShowPayment(true)}
              className="text-sm text-brand-600 hover:text-brand-800 font-medium underline"
            >
              Already paid? Submit your transaction ID
            </button>
          </div>
        )}

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 pr-4">{item.q}</span>
                  <svg
                    className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
