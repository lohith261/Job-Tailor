"use client";

import { useState } from "react";
import Link from "next/link";

function formatExpiry(isoString: string): string {
  const expiry = new Date(isoString);
  return expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResetUrl(null);
    setExpiresAt(null);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setResetUrl(data.resetUrl ?? null);
        setExpiresAt(data.expiresAt ?? null);
        setMessage(data.message ?? "Reset link generated.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSendAnother() {
    setResetUrl(null);
    setExpiresAt(null);
    setMessage("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl font-bold mb-4">
            JH
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your email to get a reset link</p>
        </div>

        {!resetUrl ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Generating link…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              If that email exists, a reset link has been generated. Check below:
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Your reset link (demo — no email server configured):</p>
              <a
                href={resetUrl}
                className="block break-all text-sm text-indigo-600 hover:underline bg-indigo-50 rounded-lg px-3 py-2"
              >
                {resetUrl}
              </a>
            </div>
            {expiresAt ? (
              <p className="text-xs text-gray-500">
                This link expires at <span className="font-medium text-gray-700">{formatExpiry(expiresAt)}</span>{" "}
                (1 hour from now).
              </p>
            ) : (
              <p className="text-xs text-gray-400">This link expires in 1 hour.</p>
            )}
            <button
              onClick={handleSendAnother}
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Send another link
            </button>
          </div>
        )}

        {!resetUrl && message && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Remember your password?{" "}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
