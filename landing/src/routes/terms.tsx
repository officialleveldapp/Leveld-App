import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

export const Route = createFileRoute("/terms")({
  component: Terms,
  head: () => ({
    meta: [
      { title: "Terms of Use — Leveld" },
      {
        name: "description",
        content: "The terms that govern your use of Leveld, including subscriptions.",
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

function Terms() {
  return (
    <LegalShell title="Terms of Use">
      <p>
        These Terms of Use ("Terms") govern your access to and use of the Leveld
        mobile application and related services (the "Service"). By creating an
        account or using Leveld, you agree to these Terms. If you do not agree, do
        not use the Service.
      </p>

      <Section heading="Eligibility and accounts">
        <p>
          You must be at least 13 years old (or the minimum age required in your
          country) to use Leveld. You are responsible for keeping your account
          credentials secure and for all activity under your account.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
          <li>Harass, abuse, impersonate, or harm other users.</li>
          <li>Attempt to disrupt, reverse engineer, or gain unauthorized access to the Service.</li>
          <li>Upload content that is illegal, infringing, or harmful.</li>
        </ul>
      </Section>

      <Section heading="Subscriptions (Leveld Pro)">
        <p>
          Leveld offers an auto-renewable subscription, "Leveld Pro," that unlocks
          premium features. The following terms apply to subscriptions purchased
          through the Apple App Store:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-white">Billing</strong> — Payment is charged to
            your Apple ID account at confirmation of purchase.
          </li>
          <li>
            <strong className="text-white">Auto-renewal</strong> — Your
            subscription automatically renews unless it is canceled at least 24
            hours before the end of the current period. Your account is charged for
            renewal within 24 hours prior to the end of the current period.
          </li>
          <li>
            <strong className="text-white">Pricing</strong> — Subscription prices
            (monthly and yearly) are shown in the app at the time of purchase, in
            your local currency.
          </li>
          <li>
            <strong className="text-white">Managing your subscription</strong> —
            You can manage or cancel your subscription, and turn off auto-renewal,
            in your Apple ID Account Settings after purchase.
          </li>
          <li>
            <strong className="text-white">Free portion forfeiture</strong> — If a
            free trial is offered, any unused portion is forfeited when you purchase
            a subscription.
          </li>
        </ul>
      </Section>

      <Section heading="Cancellations and refunds">
        <p>
          You can cancel at any time through your Apple ID settings; cancellation
          takes effect at the end of the current billing period. Refunds are
          handled by Apple in accordance with the App Store terms. We do not
          process payments directly and cannot issue App Store refunds.
        </p>
      </Section>

      <Section heading="Your content">
        <p>
          You retain ownership of the workout and profile data you create. You
          grant Leveld a limited license to store and process that content solely
          to operate and provide the Service to you.
        </p>
      </Section>

      <Section heading="Health disclaimer">
        <p>
          Leveld provides fitness tracking and informational tools only. It is not
          medical advice. Consult a qualified professional before beginning any
          exercise program. You use the Service and any training information at
          your own risk.
        </p>
      </Section>

      <Section heading="Termination">
        <p>
          You may stop using the Service and delete your account at any time. We
          may suspend or terminate access if you violate these Terms or use the
          Service in a way that could cause harm or legal liability.
        </p>
      </Section>

      <Section heading="Disclaimers and limitation of liability">
        <p>
          The Service is provided "as is" without warranties of any kind. To the
          maximum extent permitted by law, Leveld is not liable for any indirect,
          incidental, or consequential damages arising from your use of the
          Service.
        </p>
      </Section>

      <Section heading="Changes to these Terms">
        <p>
          We may update these Terms from time to time. We will update the "Last
          updated" date above, and continued use of the Service after changes
          constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section heading="Contact us">
        <p>
          Questions about these Terms? Contact us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
