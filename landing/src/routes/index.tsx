import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Flame,
  Trophy,
  ArrowRight,
  Check,
  Minus,
  Apple,
  Play,
  Target,
  Dumbbell,
  Calendar,
  Clock,
  Users,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import heroPhone from "@/assets/hero-phone.png";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Leveld — Level Up Your Fitness" },
      {
        name: "description",
        content:
          "Leveld is a premium mobile fitness app. Track workouts effortlessly, build streaks, and compete with friends. Train with clarity and momentum.",
      },
      { property: "og:title", content: "Leveld — Level Up Your Fitness" },
      {
        property: "og:description",
        content:
          "Track. Streak. Compete. A high-end training console in your pocket — built for serious training and lasting consistency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ----------------------------- Animation utils ---------------------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
  scale = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  scale?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal ${scale ? "reveal-scale" : ""} ${
        shown ? "reveal-in" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Typewriter({
  words,
  className = "",
}: {
  words: string[];
  className?: string;
}) {
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [del, setDel] = useState(false);

  useEffect(() => {
    const word = words[i % words.length];
    const speed = del ? 45 : 95;
    const t = setTimeout(() => {
      if (!del) {
        const next = word.slice(0, text.length + 1);
        setText(next);
        if (next === word) setTimeout(() => setDel(true), 1400);
      } else {
        const next = word.slice(0, Math.max(0, text.length - 1));
        setText(next);
        if (next === "") {
          setDel(false);
          setI((v) => v + 1);
        }
      }
    }, speed);
    return () => clearTimeout(t);
  }, [text, del, i, words]);

  return (
    <span className={className}>
      {text}
      <span className="caret" aria-hidden />
    </span>
  );
}


function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "backdrop-blur-xl bg-[#0A0A0A]/70 border-b border-[#1a1a1a]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2">
          <span className="text-display text-xl font-semibold tracking-tight">
            Leveld<span className="text-primary">.</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {[
            ["Product", "#product"],
            ["Progress", "#progress"],
            ["Community", "#community"],
            ["Pro", "#pro"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-sm text-[#999] transition-colors hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#"
            className="hidden text-sm text-[#999] hover:text-white sm:inline"
          >
            Log in
          </a>
          <a
            href="#get"
            className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Get the app
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-page pt-32 pb-20 md:pt-40 md:pb-32"
    >
      <div className="grain pointer-events-none absolute inset-0" />
      {/* faint grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 30%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#1a1a1a]/60 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#999]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Now in early access · iOS
            </span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="text-display mt-6 text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl lg:text-[5.5rem]">
              Level Up
              <br />
              <span className="gradient-text">Your Fitness.</span>
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <p className="text-display mt-6 text-2xl font-medium tracking-tight text-white/90 md:text-3xl">
              Built to{" "}
              <Typewriter
                className="text-primary"
                words={["track.", "streak.", "compete.", "level up."]}
              />
            </p>
          </Reveal>
          <Reveal delay={360}>
            <p className="mt-5 max-w-xl text-lg text-[#999] md:text-xl">
              Track every session, keep the streak alive, and compete with your
              crew. Leveld turns serious training into momentum you can feel.
            </p>
          </Reveal>
          <Reveal delay={480}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a
                id="get"
                href="#"
                className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium"
              >
                <Apple className="h-4 w-4" />
                Download on iOS
              </a>
              <a
                href="#product"
                className="btn-secondary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium"
              >
                <Play className="h-4 w-4" />
                See how it works
              </a>
            </div>
          </Reveal>
          <Reveal delay={600}>
            <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-[#777]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Built for consistency
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Train solo or with your crew
              </div>
              <div className="flex items-center gap-2">
                <Apple className="h-4 w-4 text-primary" />
                iPhone · Apple Watch ready
              </div>
            </div>
          </Reveal>
        </div>

        <div className="relative lg:col-span-5">
          <div
            aria-hidden
            className="ambient-glow pulse-glow absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2"
          />
          <Reveal scale delay={200}>
            <img
              src={heroPhone}
              alt="Leveld app showing today's training session, a 72% progress ring, a 27 day streak and weekly volume chart"
              width={900}
              height={1280}
              className="float-y relative mx-auto w-full max-w-[420px] drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  const items = [
    {
      icon: Dumbbell,
      label: "Track",
      title: "Log workouts with ease.",
      copy: "Sets, reps, templates, supersets. A session flow that disappears into the work.",
    },
    {
      icon: Flame,
      label: "Streak",
      title: "Stay consistent. Earn XP.",
      copy: "Show up and the streak grows. Miss a day and your crew will notice.",
    },
    {
      icon: Trophy,
      label: "Compete",
      title: "Challenge friends & groups.",
      copy: "Private leaderboards, weekly rhythms, shared energy. Accountability that feels fun.",
    },
  ];
  return (
    <section id="product" className="relative bg-section-dark py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">
              The three pillars
            </span>
            <h2 className="text-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Track. Streak. Compete.
            </h2>
            <p className="mt-4 text-[#999] md:text-lg">
              Three ideas, one rhythm. Everything in Leveld pulls toward the
              same thing — showing up tomorrow.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {items.map(({ icon: Icon, label, title, copy }, i) => (
            <Reveal key={label} delay={i * 140} scale>
              <div className="card-elev group relative h-full overflow-hidden rounded-2xl p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#13243d] ring-1 ring-primary/30">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-[#777]">
                  {label}
                </p>
                <h3 className="text-display mt-2 text-2xl font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#999]">
                  {copy}
                </p>
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Personalized() {
  const steps = [
    { icon: Target, label: "Goal", text: "Strength, endurance, weight loss, or general fitness." },
    { icon: Activity, label: "Experience", text: "Beginner, intermediate, or advanced — calibrated honestly." },
    { icon: Calendar, label: "Frequency", text: "Two, four, or six sessions a week. Your pace." },
    { icon: Clock, label: "Session", text: "Thirty minutes or ninety. Home rack or commercial floor." },
  ];
  return (
    <section className="relative bg-section-mid py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">
              Onboarding
            </span>
            <h2 className="text-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Your training,
              <br />
              personalized.
            </h2>
            <p className="mt-5 max-w-md text-[#999] md:text-lg">
              A handful of honest questions. No quiz fatigue. The app shapes
              itself around your week — not the other way around.
            </p>
          </Reveal>
          <div className="lg:col-span-7">
            <ol className="relative space-y-3 border-l border-[#2A2A2A] pl-6">
              {steps.map(({ icon: Icon, label, text }, i) => (
                <li key={label} className="relative">
                  <Reveal delay={i * 120}>
                    <span className="absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-[#0A0A0A] ring-1 ring-[#2A2A2A]">
                      <span className="text-[10px] text-[#777]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </span>
                    <div className="card-elev rounded-xl p-5">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                        <span className="text-[11px] uppercase tracking-[0.22em] text-[#777]">
                          {label}
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] text-white/90">{text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProgressSection() {
  return (
    <section id="progress" className="relative bg-section-dark py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">
              Progress
            </span>
            <h2 className="text-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Momentum, made visible.
            </h2>
            <p className="mt-4 text-[#999] md:text-lg">
              Not a dashboard you have to study. A clean read on where you are
              and where you're heading.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-6">
          {/* Weekly chart */}
          <Reveal scale className="md:col-span-4">
          <div className="card-elev rounded-2xl p-7">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#777]">
                Weekly Volume
              </p>
              <p className="text-sm text-primary">+12.4%</p>
            </div>
            <p className="text-display mt-2 text-3xl font-semibold tracking-tight">
              42,810 <span className="text-base text-[#777]">lbs</span>
            </p>
            <Sparkline className="mt-6" />
            <div className="mt-3 grid grid-cols-7 text-[10px] uppercase tracking-widest text-[#555]">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="text-center">
                  {d}
                </span>
              ))}
            </div>
          </div>
          </Reveal>

          {/* PRs */}
          <Reveal scale delay={120} className="md:col-span-2">
          <div className="card-elev rounded-2xl p-7">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#777]">
              Personal Records
            </p>
            <ul className="mt-5 space-y-4">
              {[
                ["Deadlift", "405 lb"],
                ["Squat", "315 lb"],
                ["Bench", "245 lb"],
              ].map(([name, val]) => (
                <li key={name} className="flex items-baseline justify-between">
                  <span className="text-sm text-white/85">{name}</span>
                  <span className="text-display text-lg font-medium tracking-tight">
                    {val}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2A1f0d] px-3 py-1 text-xs text-[#FFB547] ring-1 ring-[#FFB547]/20">
              <Flame className="h-3.5 w-3.5" />
              New PR this week
            </div>
          </div>
          </Reveal>

          {/* Streak */}
          <Reveal scale delay={240} className="md:col-span-3">
          <div className="card-elev rounded-2xl p-7">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#777]">
              Current Streak
            </p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-display text-5xl font-semibold tracking-tight">
                27
              </span>
              <span className="pb-2 text-sm text-[#999]">days · sharp</span>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="h-3 rounded-sm"
                  style={{
                    backgroundColor:
                      i < 27
                        ? `rgba(76,145,255,${0.25 + (i / 28) * 0.7})`
                        : "#1c1c1c",
                  }}
                />
              ))}
            </div>
          </div>
          </Reveal>

          {/* History */}
          <Reveal scale delay={360} className="md:col-span-3">
          <div className="card-elev rounded-2xl p-7">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#777]">
              History at a glance
            </p>
            <ul className="mt-4 divide-y divide-[#2A2A2A]">
              {[
                ["Push · Upper", "Mon", "58 min"],
                ["Pull · Back", "Wed", "62 min"],
                ["Legs · Heavy", "Fri", "71 min"],
              ].map(([t, d, dur]) => (
                <li key={t} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm text-white/90">{t}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#777]">
                    <span>{d}</span>
                    <span>{dur}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Sparkline({ className = "" }: { className?: string }) {
  // Polyline sparkline
  const points = [22, 38, 30, 55, 48, 70, 62];
  const max = 80;
  const w = 100;
  const h = 36;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * h}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`h-24 w-full ${className}`}>
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4C91FF" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4C91FF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path
        d={path}
        fill="none"
        stroke="#4C91FF"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Community() {
  const avatars = [
    "from-[#4C91FF] to-[#3B7DE0]",
    "from-[#845EF7] to-[#4C91FF]",
    "from-[#20C997] to-[#4C91FF]",
    "from-[#FFB547] to-[#FF922B]",
    "from-[#CC5DE8] to-[#845EF7]",
  ];
  return (
    <section id="community" className="relative bg-section-mid py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">
              Community
            </span>
            <h2 className="text-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Train with your crew.
            </h2>
            <p className="mt-5 max-w-md text-[#999] md:text-lg">
              Invite friends, form private groups, and ride the same wave.
              Supportive, sharp, never toxic.
            </p>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {avatars.map((g, i) => (
                  <div
                    key={i}
                    className={`h-11 w-11 rounded-full bg-gradient-to-br ${g} ring-2 ring-[#1E1E1E]`}
                  />
                ))}
              </div>
              <p className="text-sm text-[#999]">
                <span className="text-white">Your group</span> · 5 active this
                week
              </p>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="card-elev rounded-2xl p-7">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#777]">
                  Group · Heavy Mondays
                </p>
                <span className="rounded-full bg-[#13243d] px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary">
                  Live
                </span>
              </div>

              <ul className="mt-6 divide-y divide-[#2A2A2A]">
                {[
                  ["Mara", 12, true],
                  ["Devon", 11, false],
                  ["You", 10, false],
                  ["Kai", 9, false],
                  ["Sloane", 7, false],
                ].map(([name, sessions, leader], i) => (
                  <li
                    key={String(name)}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-sm text-[#777]">
                        {i + 1}
                      </span>
                      <div
                        className={`h-8 w-8 rounded-full bg-gradient-to-br ${avatars[i]}`}
                      />
                      <span className="text-sm text-white/90">{name}</span>
                      {leader && (
                        <span className="rounded-full bg-[#2A1f0d] px-2 py-0.5 text-[10px] uppercase tracking-widest text-[#FFB547]">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-[#1c1c1c] sm:block">
                        <div
                          className="h-full gradient-primary"
                          style={{ width: `${(Number(sessions) / 12) * 100}%` }}
                        />
                      </div>
                      <span className="text-display w-10 text-right text-sm">
                        {sessions}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-[#2A2A2A] bg-[#0f0f0f] p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm text-white/85">
                    Invite your training partner
                  </p>
                </div>
                <button className="btn-secondary rounded-full px-4 py-2 text-xs font-medium">
                  Send invite
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BodyTeaser() {
  return (
    <section className="relative bg-section-dark py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-primary">
            Body awareness
          </span>
          <h2 className="text-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            See your training distribution with clarity.
          </h2>
          <p className="mt-5 max-w-md text-[#999] md:text-lg">
            A calm, visual read on where the work is going — and where it
            isn't. Balance the body without thinking about it.
          </p>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="ambient-glow absolute inset-0 mx-auto h-80 w-80"
          />
          <SilhouetteGraphic />
        </div>
      </div>
    </section>
  );
}

function SilhouetteGraphic() {
  // Stylized abstract figure with muscle-zone glows
  return (
    <div className="relative mx-auto flex aspect-square max-w-md items-center justify-center">
      <svg viewBox="0 0 200 320" className="h-full w-full">
        <defs>
          <linearGradient id="bodyG" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1E2A3A" />
            <stop offset="100%" stopColor="#0e1622" />
          </linearGradient>
          <radialGradient id="hot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4C91FF" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#4C91FF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="warm" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB547" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFB547" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Head */}
        <circle cx="100" cy="38" r="22" fill="url(#bodyG)" stroke="#2A2A2A" />
        {/* Torso */}
        <path
          d="M65 70 Q100 60 135 70 L150 150 Q135 175 100 175 Q65 175 50 150 Z"
          fill="url(#bodyG)"
          stroke="#2A2A2A"
        />
        {/* Arms */}
        <path d="M50 80 L30 170 L42 175 L62 95 Z" fill="url(#bodyG)" stroke="#2A2A2A" />
        <path d="M150 80 L170 170 L158 175 L138 95 Z" fill="url(#bodyG)" stroke="#2A2A2A" />
        {/* Legs */}
        <path d="M75 175 L70 290 L88 290 L96 180 Z" fill="url(#bodyG)" stroke="#2A2A2A" />
        <path d="M125 175 L130 290 L112 290 L104 180 Z" fill="url(#bodyG)" stroke="#2A2A2A" />

        {/* Heat zones */}
        <circle cx="100" cy="105" r="34" fill="url(#hot)" />
        <circle cx="40" cy="120" r="22" fill="url(#hot)" />
        <circle cx="160" cy="120" r="22" fill="url(#hot)" />
        <circle cx="85" cy="230" r="28" fill="url(#warm)" />
        <circle cx="115" cy="230" r="28" fill="url(#warm)" />
      </svg>

      <div className="absolute right-2 top-6 rounded-lg border border-[#2A2A2A] bg-[#0f0f0f]/80 px-3 py-2 text-xs backdrop-blur">
        <p className="text-[10px] uppercase tracking-widest text-[#777]">Chest</p>
        <p className="text-display text-sm text-primary">High</p>
      </div>
      <div className="absolute bottom-10 left-2 rounded-lg border border-[#2A2A2A] bg-[#0f0f0f]/80 px-3 py-2 text-xs backdrop-blur">
        <p className="text-[10px] uppercase tracking-widest text-[#777]">Quads</p>
        <p className="text-display text-sm text-[#FFB547]">Medium</p>
      </div>
    </div>
  );
}

function AnimatedPrice({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    if (value === display) return;
    setPhase("out");
    const t = setTimeout(() => {
      setDisplay(value);
      setPhase("in");
    }, 180);
    return () => clearTimeout(t);
  }, [value, display]);
  return (
    <span
      className="text-display inline-block tabular-nums transition-all duration-200"
      style={{
        opacity: phase === "in" ? 1 : 0,
        transform:
          phase === "in" ? "translateY(0)" : "translateY(-8px)",
      }}
    >
      {display}
    </span>
  );
}

function Pricing() {
  const [yearly, setYearly] = useState(true);
  const rows: { feat: string; free: boolean; pro: boolean }[] = [
    { feat: "Unlimited workout logging", free: true, pro: true },
    { feat: "Streaks & XP", free: true, pro: true },
    { feat: "Friends & private groups", free: true, pro: true },
    { feat: "Advanced progress insights", free: false, pro: true },
    { feat: "Custom programs & periodization", free: false, pro: true },
    { feat: "Body distribution view", free: false, pro: true },
  ];

  const price = yearly ? "$29.99" : "$6.99";
  const cadence = yearly ? "/year" : "/month";
  const subnote = yearly
    ? "Just $2.50 / month, billed yearly."
    : "Cancel anytime. No commitment.";

  return (
    <section id="pro" className="relative bg-section-mid py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">
              Pricing
            </span>
            <h2 className="text-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Free, with Pro when you want depth.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[#999] md:text-lg">
              Use Leveld free, forever. Upgrade when you're ready — no
              pressure, no dark patterns.
            </p>
          </div>
        </Reveal>

        {/* Toggle */}
        <Reveal delay={120}>
          <div className="mt-10 flex items-center justify-center">
            <div className="relative grid grid-cols-2 rounded-full border border-[#2A2A2A] bg-[#0f0f0f] p-1 w-[320px]">
              <span
                className="absolute top-1 bottom-1 left-1 rounded-full gradient-primary transition-transform duration-300 ease-out"
                style={{
                  width: "calc(50% - 4px)",
                  transform: yearly ? "translateX(100%)" : "translateX(0)",
                }}
              />
              <button
                onClick={() => setYearly(false)}
                className={`relative z-10 px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors ${
                  !yearly ? "text-white" : "text-[#888]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`relative z-10 inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors ${
                  yearly ? "text-white" : "text-[#888]"
                }`}
              >
                Yearly
                <span className="rounded-full bg-[#FFB547]/15 px-1.5 py-0.5 text-[9px] tracking-wider text-[#FFB547]">
                  −64%
                </span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* Plan cards */}
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Reveal delay={160} scale>
            <div className="card-elev h-full rounded-2xl p-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#777]">
                Free
              </p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-display text-5xl font-semibold tracking-tight">
                  $0
                </span>
                <span className="text-sm text-[#777]">/forever</span>
              </div>
              <p className="mt-3 text-sm text-[#999]">
                Everything you need to track, streak, and train with friends.
              </p>
              <a
                href="#"
                className="btn-secondary mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
              >
                <Apple className="h-4 w-4" />
                Download on iOS
              </a>
              <ul className="mt-7 space-y-3 text-sm text-[#bbb]">
                {[
                  "Unlimited workout logging",
                  "Streaks & XP",
                  "Friends & private groups",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/60" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={280} scale>
            <div className="relative h-full overflow-hidden rounded-2xl p-[1px]">
              <div
                aria-hidden
                className="absolute inset-0 gradient-primary opacity-80"
              />
              <div className="relative h-full rounded-[15px] bg-[#0e1320] p-8">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-primary">
                    Leveld Pro
                  </p>
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-widest text-primary ring-1 ring-primary/30">
                    Most popular
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">
                    <AnimatedPrice value={price} />
                  </span>
                  <span className="text-sm text-[#999]">{cadence}</span>
                </div>
                <p className="mt-3 text-sm text-[#9bb4d6]">{subnote}</p>
                <a
                  href="#"
                  className="btn-primary mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
                >
                  Start 7-day free trial
                  <ArrowRight className="h-4 w-4" />
                </a>
                <ul className="mt-7 space-y-3 text-sm text-white/90">
                  {[
                    "Everything in Free",
                    "Advanced progress insights",
                    "Custom programs & periodization",
                    "Body distribution view",
                    "Priority sync & backup",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>

        {/* Comparison */}
        <Reveal delay={200}>
          <div className="mt-12 overflow-hidden rounded-2xl border border-[#2A2A2A]">
            <div className="grid grid-cols-3 border-b border-[#2A2A2A] bg-[#141414]">
              <div className="p-5 text-[11px] uppercase tracking-[0.22em] text-[#777]">
                Compare
              </div>
              <div className="p-5 text-center text-[11px] uppercase tracking-[0.22em] text-[#777]">
                Free
              </div>
              <div className="p-5 text-center text-[11px] uppercase tracking-[0.22em] text-primary">
                Pro
              </div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.feat}
                className={`grid grid-cols-3 ${
                  i % 2 === 0 ? "bg-[#0f0f0f]" : "bg-[#121212]"
                }`}
              >
                <div className="p-5 text-sm text-white/85">{r.feat}</div>
                <div className="flex items-center justify-center p-5">
                  {r.free ? (
                    <Check className="h-4 w-4 text-white/70" />
                  ) : (
                    <Minus className="h-4 w-4 text-[#555]" />
                  )}
                </div>
                <div className="flex items-center justify-center p-5">
                  {r.pro ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Minus className="h-4 w-4 text-[#555]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#2A2A2A]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="text-[15px] font-medium text-white/95 md:text-base">
          {q}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#999] transition-transform ${
            open ? "rotate-180 text-primary" : ""
          }`}
        />
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ${
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <p className="max-w-2xl text-sm leading-relaxed text-[#999]">{a}</p>
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  const faqs = [
    {
      q: "Does Leveld work offline?",
      a: "Yes. Log your full session offline — everything syncs when you're back online.",
    },
    {
      q: "Is my data private?",
      a: "Your training data is yours. Groups only see what you choose to share, and you can leave or hide any group at any time.",
    },
    {
      q: "Which platforms is Leveld on?",
      a: "Leveld is iOS only for now — built natively for iPhone and Apple Watch. Android isn't on the roadmap.",
    },
    {
      q: "Can I import workouts from other apps?",
      a: "We're rolling out import paths gradually. CSV is supported today; native imports are coming.",
    },
    {
      q: "How do groups work?",
      a: "Create a private group, invite friends with a link, and share weekly rhythms and leaderboards. No public feed, no noise.",
    },
    {
      q: "How does the subscription work?",
      a: "Pro is an in-app subscription, billed monthly or yearly. Cancel any time from your platform's subscription settings.",
    },
    {
      q: "Will Leveld stay free?",
      a: "Yes. The core experience — tracking, streaks, groups — stays free. Pro adds depth for people who want it.",
    },
  ];
  return (
    <section id="faq" className="relative bg-section-dark py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">
            FAQ
          </span>
          <h2 className="text-display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            Questions, answered.
          </h2>
          <p className="mt-4 max-w-sm text-[#999]">
            Anything we missed?{" "}
            <a href="#" className="text-primary hover:underline">
              Reach out
            </a>
            .
          </p>
        </div>
        <div className="lg:col-span-8">
          {faqs.map((f) => (
            <FAQItem key={f.q} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-section-mid py-24">
      <div
        aria-hidden
        className="ambient-glow pulse-glow absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-display text-4xl font-semibold tracking-tight md:text-6xl">
            Train sharper.
            <br />
            <span className="gradient-text">
              Stay{" "}
              <Typewriter
                className="text-primary"
                words={["levelled.", "consistent.", "ready.", "sharp."]}
              />
            </span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <p className="mx-auto mt-5 max-w-md text-[#999] md:text-lg">
            Get Leveld and turn this week into a streak you actually keep.
          </p>
        </Reveal>
        <Reveal delay={300}>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium"
            >
              <Apple className="h-4 w-4" />
              Download on iOS
            </a>
            <a
              href="#pro"
              className="btn-secondary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium"
            >
              See pricing
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#070707] pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="text-display text-2xl font-semibold tracking-tight">
              Leveld<span className="text-primary">.</span>
            </span>
            <p className="mt-3 max-w-xs text-sm text-[#777]">
              Level up your fitness — quietly, consistently, with your crew.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {[
              ["Product", [["Features", "#features"], ["Pro", "#pro"], ["Download", "#"]]],
              ["Company", [["About", "#"], ["Contact", `mailto:support@leveldai.com`], ["Press", "#"]]],
              ["Legal", [["Terms", "/terms"], ["Privacy", "/privacy-policy"]]],
            ].map(([title, items]) => (
              <div key={title as string}>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#555]">
                  {title as string}
                </p>
                <ul className="mt-4 space-y-2">
                  {(items as [string, string][]).map(([label, href]) => (
                    <li key={label}>
                      <a
                        href={href}
                        className="text-sm text-[#999] hover:text-white"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[#1a1a1a] pt-6 text-xs text-[#555] md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Leveld. All rights reserved.</p>
          <p>Made for people who actually show up.</p>
        </div>
      </div>
    </footer>
  );
}

function Index() {
  return (
    <main className="bg-[#0A0A0A] text-white">
      <Nav />
      <Hero />
      <Pillars />
      <Personalized />
      <ProgressSection />
      <Community />
      <BodyTeaser />
      <Pricing />
      <FAQ />
      <CtaBand />
      <Footer />
    </main>
  );
}
