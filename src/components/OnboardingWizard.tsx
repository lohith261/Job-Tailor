"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OnboardingWizardProps {
  onComplete: () => void;
  onDismiss: () => void;
}

const TOTAL_STEPS = 4;

export function OnboardingWizard({ onComplete, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const router = useRouter();

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSetupSearch = () => {
    onDismiss();
    router.push("/settings");
  };

  const handleUploadResume = () => {
    onDismiss();
    router.push("/resumes");
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-8">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const dotStep = i + 1;
            if (dotStep < step) {
              // completed
              return (
                <span
                  key={dotStep}
                  className="w-2.5 h-2.5 rounded-full bg-indigo-600"
                />
              );
            } else if (dotStep === step) {
              // current
              return (
                <span
                  key={dotStep}
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-indigo-600 ring-offset-2 bg-indigo-600"
                />
              );
            } else {
              // future
              return (
                <span
                  key={dotStep}
                  className="w-2.5 h-2.5 rounded-full bg-gray-200"
                />
              );
            }
          })}
        </div>

        {/* Step content */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Welcome to Job-Tailor 👋
            </h2>
            <p className="text-gray-600 mb-8">
              Let&apos;s set you up in 2 minutes so we can find jobs that actually match your skills.
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={onDismiss}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip setup
              </button>
              <button
                onClick={goNext}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Let&apos;s go →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              What roles are you looking for?
            </h2>
            <p className="text-gray-600 mb-8">
              Set your job titles, preferred locations, salary range and experience level so our AI can score every job against your goals.
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={goBack}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Back
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={goNext}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleSetupSearch}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Set up Search Config
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Upload your resume
            </h2>
            <p className="text-gray-600 mb-8">
              Upload your resume (PDF, DOCX, or TXT) so we can tailor it for each role and generate personalised cover letters.
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={goBack}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Back
              </button>
              <div className="flex items-center gap-4">
                <button
                  onClick={goNext}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleUploadResume}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Upload Resume
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              You&apos;re ready to find jobs 🎉
            </h2>
            <p className="text-gray-600 mb-8">
              Click <strong>Scrape Now</strong> on this page to pull fresh job listings, or click <strong>Run Pipeline</strong> for full AI analysis. Come back here to review your matches.
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={goBack}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={onComplete}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Start exploring →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
