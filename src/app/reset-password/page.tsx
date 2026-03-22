"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type TokenStatus = "loading" | "valid" | "expired" | "invalid";

function formatExpiry(isoString: string): string {
  const expiry = new Date(isoString);
  return expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function minutesUntil(isoString: string): number {
  return Math.max(0, Math.round((new Date(isoString).getTime() - Date.now()) / 60000));
}

function ResendForm({ prefillEmail }: { prefillEmail?: string }) {
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendError, setResendError] = useState("");

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setResendError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendError(data.error ?? "Something went wrong");
      } else {
        setSent(true);
      }
    } catch {
      setResendError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
        A new reset link has been generated. Check your email or the link above.
      </div>
    );
  }

  return (
    <form onSubmit={handleResend} className="space-y-3">
      {resendError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {resendError}
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
        {loading ? "Sending…" : "Resend reset link"}
      </button>
    </form>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? "loading" : "invalid");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok && data.valid) {
          setExpiresAt(data.expiresAt);
          setTokenStatus("valid");
        } else if (data.expired) {
          setTokenStatus("expired");
        } else {
          setTokenStatus("invalid");
        }
      } catch {
        setTokenStatus("invalid");
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Token may have expired between validation and submission
        if (data.error?.toLowerCase().includes("expired")) {
          setTokenStatus("expired");
        } else {
          setError(data.error ?? "Failed to reset password.");
        }
      } else {
        router.push("/login?reset=success");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (tokenStatus === "loading") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center text-sm text-gray-500">
        Validating your reset link…
      </div>
    );
  }

  if (tokenStatus === "expired") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">This reset link has expired.</p>
          <p className="mt-1 text-amber-700">Reset links are valid for 1 hour. Request a new one to continue.</p>
        </div>
        {!showResend ? (
          <button
            onClick={() => setShowResend(true)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Request a new reset link
          </button>
        ) : (
          <ResendForm />
        )}
      </div>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">Invalid reset link.</p>
          <p className="mt-1">This link is not recognised. It may have already been used or never existed.</p>
        </div>
        {!showResend ? (
          <button
            onClick={() => setShowResend(true)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Request a new reset link
          </button>
        ) : (
          <ResendForm />
        )}
      </div>
    );
  }

  // tokenStatus === "valid"
  const minsLeft = expiresAt ? minutesUntil(expiresAt) : null;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
      {expiresAt && (
        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-2.5 text-xs text-blue-700">
          {minsLeft !== null && minsLeft > 0
            ? `This link expires in ${minsLeft} minute${minsLeft === 1 ? "" : "s"} (at ${formatExpiry(expiresAt)}).`
            : `This link expires at ${formatExpiry(expiresAt)}.`}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">New password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={8}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm new password</label>
        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          minLength={8}
          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Resetting…" : "Reset password"}
      </button>

      <div className="pt-1 border-t border-gray-100 text-center">
        <button
          type="button"
          onClick={() => setShowResend((v) => !v)}
          className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
        >
          {showResend ? "Hide resend form" : "Need a new link instead?"}
        </button>
        {showResend && (
          <div className="mt-3">
            <ResendForm />
          </div>
        )}
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white text-xl font-bold mb-4">
            JH
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter a new password for your account</p>
        </div>

        <Suspense fallback={<div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center text-sm text-gray-500">Loading…</div>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
