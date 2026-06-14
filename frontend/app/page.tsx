import Link from "next/link";
import InteractiveCoachStage from "./components/InteractiveCoachStage";

const sessionMetrics = [
  { label: "Pronunciation", value: "word-level", note: "finds exact falters" },
  { label: "Coach voice", value: "spoken", note: "talks corrections back" },
  { label: "Practice loop", value: "1 take", note: "record, review, repeat" },
];

const pronunciationExamples = [
  {
    word: "confidence",
    correction: "CON-fi-dence",
    note: "Finish the final -dence cleanly instead of fading out.",
  },
  {
    word: "presentation",
    correction: "pre-zen-TAY-shun",
    note: "Stretch the middle stress and keep the ending light.",
  },
  {
    word: "specific",
    correction: "spuh-SI-fik",
    note: "Separate the first two sounds so the word does not blur.",
  },
];

const coachingFlow = [
  {
    title: "Record real speech",
    text: "Practice an answer, intro, pitch, or daily-English prompt with your selected language and goal.",
  },
  {
    title: "Hear the exact fix",
    text: "Vaani names the word, explains what sounded off, and gives the correct pronunciation.",
  },
  {
    title: "Repeat with one target",
    text: "The next drill is focused, so your second take has a clear measurable improvement.",
  },
];

const focusAreas = [
  "Interview answers",
  "Presentation clarity",
  "Daily English",
  "Pronunciation",
  "Pacing",
  "Confidence",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050712] text-[#f7fbff]">
      <section className="relative isolate overflow-hidden border-b border-[#6ee7d8]/18 bg-[#050712]">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(128deg,#050712_0%,#0b1324_44%,#12313a_100%)]" />
        <div className="absolute inset-0 -z-10 opacity-35 [background-image:linear-gradient(rgba(110,231,216,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(248,113,113,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute bottom-0 left-0 right-0 -z-10 h-40 bg-[linear-gradient(180deg,transparent,rgba(110,231,216,0.08))]" />

        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid h-10 w-10 place-items-center rounded-md border border-[#6ee7d8]/50 bg-[#6ee7d8]/12 text-lg font-black text-[#9ff5ec] shadow-[0_0_28px_rgba(110,231,216,0.2)]">
              V
            </span>
            <span className="text-xl font-semibold">Vaani AI</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm text-[#d8eff2]/72 md:flex">
            <a className="transition hover:text-white" href="#pronunciation">
              Pronunciation
            </a>
            <a className="transition hover:text-white" href="#flow">
              Flow
            </a>
            <a className="transition hover:text-white" href="#focus">
              Focus
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="hidden rounded-md border border-[#6ee7d8]/28 px-4 py-2 text-sm font-semibold text-[#9ff5ec] transition hover:border-[#6ee7d8]/70 hover:bg-[#6ee7d8]/10 sm:inline-flex"
              href="/company-login"
            >
              Company login
            </Link>
            <Link
              className="rounded-md border border-[#f87171]/38 px-4 py-2 text-sm font-semibold text-[#ffd6d6] transition hover:border-[#f87171]/75 hover:bg-[#f87171]/10"
              href="/login"
            >
              Enter coach
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid min-h-[82vh] max-w-7xl items-center gap-10 px-5 pb-10 pt-8 sm:px-8 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-md border border-[#6ee7d8]/35 bg-[#6ee7d8]/10 px-3 py-2 text-sm font-bold text-[#9ff5ec]">
              Exact voice coaching, word by word
            </p>
            <h1 className="text-5xl font-black leading-[0.96] text-white sm:text-6xl lg:text-7xl">
              Vaani AI
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-semibold leading-8 text-[#f7fbff]">
              Practice out loud, then hear the precise word you faltered on and
              how to pronounce it correctly.
            </p>
            <p className="mt-4 max-w-2xl leading-8 text-[#d8eff2]/72">
              Built for interviews, presentations, and everyday speaking. The
              coach listens to the actual recording, scores your delivery, and
              turns the next attempt into a focused drill.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-md bg-[#6ee7d8] px-6 py-4 text-center font-black text-[#061117] shadow-[0_0_36px_rgba(110,231,216,0.24)] transition hover:bg-[#9ff5ec]"
                href="/login"
              >
                Start practice
              </Link>
              <Link
                className="rounded-md border border-white/16 px-6 py-4 text-center font-black text-white transition hover:border-white/42 hover:bg-white/10"
                href="/company-login"
              >
                Company dashboard
              </Link>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {sessionMetrics.map((metric) => (
                <div
                  className="rounded-md border border-white/10 bg-white/[0.045] p-4"
                  key={metric.label}
                >
                  <p className="text-sm font-bold text-[#d8eff2]/62">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-sm text-[#d8eff2]/60">{metric.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <InteractiveCoachStage />
          </div>
        </div>
      </section>

      <section
        className="border-b border-[#6ee7d8]/14 bg-[#07101d]"
        id="pronunciation"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.62fr_1.38fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
              Exact pronunciation
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-white">
              Not vague tips. The actual word.
            </h2>
            <p className="mt-4 leading-7 text-[#d8eff2]/68">
              Vaani reports the word, the correction, and a short practice line
              that can be played back as coach voice.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {pronunciationExamples.map((item) => (
              <article
                className="rounded-md border border-[#6ee7d8]/16 bg-[#050712] p-5"
                key={item.word}
              >
                <p className="text-sm font-bold uppercase text-[#fca5a5]">
                  Word
                </p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  {item.word}
                </h3>
                <p className="mt-4 rounded-md bg-[#6ee7d8]/10 px-3 py-2 font-black text-[#9ff5ec]">
                  {item.correction}
                </p>
                <p className="mt-4 leading-7 text-[#d8eff2]/70">{item.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8" id="flow">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
              Coaching flow
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
              One recording becomes one clear next move.
            </h2>
          </div>
          <Link
            className="rounded-md border border-[#6ee7d8]/26 px-5 py-3 text-center font-black text-[#9ff5ec] transition hover:border-[#6ee7d8]/70 hover:bg-[#6ee7d8]/10"
            href="/onboarding"
          >
            Set your goal
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {coachingFlow.map((item, index) => (
            <article
              className="rounded-md border border-white/10 bg-white/[0.045] p-6"
              key={item.title}
            >
              <span className="grid h-11 w-11 place-items-center rounded-md bg-[#f87171] text-lg font-black text-[#210909]">
                {index + 1}
              </span>
              <h3 className="mt-5 text-2xl font-black text-white">
                {item.title}
              </h3>
              <p className="mt-4 leading-7 text-[#d8eff2]/68">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="border-t border-[#6ee7d8]/14 bg-[#0b1324]"
        id="focus"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
              Practice areas
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight text-white">
              Tune the coach to the moment you are preparing for.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {focusAreas.map((item) => (
              <div
                className="rounded-md border border-white/10 bg-[#050712] p-5 font-black text-[#f7fbff]"
                key={item}
              >
                <span className="mr-3 inline-block h-2.5 w-2.5 rounded-full bg-[#6ee7d8]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
