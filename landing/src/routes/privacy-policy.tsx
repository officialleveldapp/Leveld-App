import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

export const Route = createFileRoute("/privacy-policy")({
  component: PrivacyPolicy,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Leveld" },
      {
        name: "description",
        content: "How Leveld collects, uses, and protects your data.",
      },
    ],
  }),
});

const EFFECTIVE_DATE = "June 15, 2026";
const CONTACT_EMAIL = "support@leveldai.com";

function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-[#1a1a1a]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-display text-xl font-semibold tracking-tight">
            Leveld<span className="text-primary">.</span>
          </Link>
          <Link to="/" className="text-sm text-[#999] hover:text-white">
            ← Back to home
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-display text-4xl font-semibold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[#777]">Last updated: {EFFECTIVE_DATE}</p>
        <div className="legal-body mt-10 space-y-8 text-[15px] leading-relaxed text-[#bbb]">
          {children}
        </div>
      </article>
      <footer className="border-t border-[#1a1a1a] py-8">
        <div className="mx-auto max-w-3xl px-6 text-xs text-[#555]">
          © {new Date().getFullYear()} Leveld. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white">{heading}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function PrivacyPolicy() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        This Privacy Policy explains how Leveld ("we", "us", or "our") collects,
        uses, and shares information when you use the Leveld mobile application
        and related services (the "Service"). By using Leveld, you agree to the
        practices described here.
      </p>

      <Section heading="Information we collect">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Account information</strong> — your
            email address and the name or username you provide when you create an
            account. If you sign in with Google, we receive your email and basic
            profile information from Google.
          </li>
          <li>
            <strong className="text-white">Fitness and workout data</strong> —
            workouts, exercises, sets, reps, weights, streaks, goals, and other
            training data you log in the app.
          </li>
          <li>
            <strong className="text-white">Social data</strong> — friends you
            follow, groups you join, and group activity you choose to share.
          </li>
          <li>
            <strong className="text-white">Purchase information</strong> — your
            subscription status and transaction history, processed by Apple and
            our payments partner RevenueCat. We never receive or store your full
            payment card details.
          </li>
          <li>
            <strong className="text-white">Device and usage data</strong> — basic
            technical information needed to operate the app, such as app version
            and notification preferences.
          </li>
        </ul>
      </Section>

      <Section heading="How we use your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To provide, maintain, and improve the Service.</li>
          <li>To sync your workouts, streaks, badges, and social features across sessions.</li>
          <li>To process and manage your subscription and entitlements.</li>
          <li>To send notifications and reminders you have enabled.</li>
          <li>To protect against fraud, abuse, and security threats.</li>
        </ul>
      </Section>

      <Section heading="How we share information">
        <p>
          We do not sell your personal information. We share information only with
          service providers that help us run the app, including:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Apple</strong> — for in-app purchases
            and subscription processing.
          </li>
          <li>
            <strong className="text-white">RevenueCat</strong> — to manage and
            validate subscriptions and entitlements.
          </li>
          <li>
            <strong className="text-white">Google</strong> — if you choose to sign
            in with Google.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law or to protect the
          rights, safety, and security of Leveld and its users.
        </p>
      </Section>

      <Section heading="Your choices and rights">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Access and update</strong> — you can
            view and edit your profile and training data in the app.
          </li>
          <li>
            <strong className="text-white">Delete your account</strong> — you can
            permanently delete your account and associated data from within the
            app (Profile → Delete Account). This action is irreversible.
          </li>
          <li>
            <strong className="text-white">Notifications</strong> — you can turn
            notifications on or off in the app and in your device settings.
          </li>
        </ul>
      </Section>

      <Section heading="Data retention">
        <p>
          We retain your information for as long as your account is active. When
          you delete your account, we delete your personal data from our active
          systems, except where we are required to retain it to comply with legal
          obligations.
        </p>
      </Section>

      <Section heading="Children's privacy">
        <p>
          Leveld is not directed to children under 13 (or the minimum age required
          in your country). We do not knowingly collect personal information from
          children. If you believe a child has provided us information, contact us
          and we will delete it.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will update the
          "Last updated" date above, and material changes will be reflected in the
          app or on this page.
        </p>
      </Section>

      <Section heading="Contact us">
        <p>
          If you have questions about this Privacy Policy, contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
