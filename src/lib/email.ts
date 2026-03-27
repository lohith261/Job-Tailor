import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Job Tailor <noreply@jobtailor.in>";
const APP_URL = process.env.NEXTAUTH_URL || "https://jobtailor.in";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your Job Tailor account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:700;color:#1f2937;margin-bottom:8px">Verify your email</h1>
        <p style="color:#6b7280;margin-bottom:24px">Click the button below to verify your Job Tailor account. This link expires in 24 hours.</p>
        <a href="${url}" style="display:inline-block;background:#1f9e97;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Verify Email →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't create this account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Welcome to Job Tailor 🎯",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:700;color:#1f2937;margin-bottom:8px">Welcome${name ? `, ${name}` : ""}! 🎯</h1>
        <p style="color:#6b7280;margin-bottom:16px">Your Job Tailor account is ready. Here's how to get started:</p>
        <ol style="color:#374151;padding-left:20px;margin-bottom:24px">
          <li style="margin-bottom:8px"><strong>Set up your search config</strong> — tell us what roles you're targeting</li>
          <li style="margin-bottom:8px"><strong>Upload your resume</strong> — we'll use it for AI analysis and tailoring</li>
          <li style="margin-bottom:8px"><strong>Scrape live jobs</strong> — get scored matches from 6 job boards</li>
          <li style="margin-bottom:8px"><strong>Run the pipeline</strong> — auto-generate cover letters for your top matches</li>
        </ol>
        <a href="${APP_URL}" style="display:inline-block;background:#1f9e97;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Open Job Tailor →</a>
      </div>
    `,
  });
}

export async function sendDay2Email(email: string, name: string) {
  const APP_URL = process.env.NEXTAUTH_URL || "https://jobtailor.in";
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Have you tried the pipeline yet?",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:8px">Quick tip${name ? `, ${name}` : ""} 👋</h1>
        <p style="color:#6b7280;margin-bottom:16px">The fastest way to get value from Job Tailor is to run the pipeline. It scrapes fresh jobs, scores them against your profile, and generates cover letters — all in one click.</p>
        <p style="color:#374151;font-weight:600;margin-bottom:8px">To get the best results:</p>
        <ol style="color:#374151;padding-left:20px;margin-bottom:24px">
          <li style="margin-bottom:6px">Go to <strong>Search Config</strong> and set your target roles, skills, and location</li>
          <li style="margin-bottom:6px">Upload your resume under <strong>Resumes</strong></li>
          <li style="margin-bottom:6px">Click <strong>Run Pipeline</strong> — it does the rest automatically</li>
        </ol>
        <a href="${APP_URL}/pipeline" style="display:inline-block;background:#1f9e97;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Run the Pipeline →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">You're receiving this because you signed up for Job Tailor.</p>
      </div>
    `,
  });
}

export async function sendDay6Email(email: string, name: string) {
  const APP_URL = process.env.NEXTAUTH_URL || "https://jobtailor.in";
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "How's the job search going?",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:22px;font-weight:700;color:#1f2937;margin-bottom:8px">A week in${name ? `, ${name}` : ""} 🎯</h1>
        <p style="color:#6b7280;margin-bottom:16px">Hope the job search is going well! Free accounts get a taste of what Job Tailor can do — here's what you unlock with Pro:</p>
        <div style="background:#f0fdfc;border:1px solid #99f6e4;border-radius:8px;padding:16px;margin-bottom:24px">
          <ul style="color:#134e4a;padding-left:20px;margin:0">
            <li style="margin-bottom:6px"><strong>Unlimited</strong> AI resume analyses</li>
            <li style="margin-bottom:6px"><strong>Unlimited</strong> cover letter generation</li>
            <li style="margin-bottom:6px"><strong>Unlimited</strong> cold outreach emails</li>
            <li style="margin-bottom:6px"><strong>Daily automated</strong> pipeline — jobs come to you</li>
            <li style="margin-bottom:6px"><strong>Tailored resumes</strong> for every application</li>
          </ul>
        </div>
        <a href="${APP_URL}/pricing" style="display:inline-block;background:#1f9e97;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Upgrade to Pro →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">You're receiving this because you signed up for Job Tailor.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Job Tailor password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:700;color:#1f2937;margin-bottom:8px">Reset your password</h1>
        <p style="color:#6b7280;margin-bottom:24px">Click the button below to reset your Job Tailor password. This link expires in 1 hour.</p>
        <a href="${url}" style="display:inline-block;background:#1f9e97;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Reset Password →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendProActivationEmail(email: string, plan: string, endsAt: Date) {
  const planLabel = plan === "annual" ? "Annual" : "Monthly";
  const expiryStr = endsAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "You're now on Job Tailor Pro ⚡",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:700;color:#1f2937;margin-bottom:8px">You're on Pro! ⚡</h1>
        <p style="color:#6b7280;margin-bottom:16px">Your ${planLabel} Pro subscription is now active.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px">
          <p style="color:#166534;font-weight:600;margin:0">Plan: ${planLabel}</p>
          <p style="color:#166534;margin:4px 0 0">Valid until: ${expiryStr}</p>
        </div>
        <p style="color:#374151;margin-bottom:16px">You now have unlimited access to:</p>
        <ul style="color:#374151;padding-left:20px;margin-bottom:24px">
          <li>AI resume analyses</li>
          <li>Cover letter generation</li>
          <li>Cold outreach emails</li>
          <li>Tailored resume generation</li>
          <li>Full automation pipeline</li>
        </ul>
        <a href="${APP_URL}" style="display:inline-block;background:#1f9e97;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">Start using Pro →</a>
      </div>
    `,
  });
}
