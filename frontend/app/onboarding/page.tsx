"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const featuredLanguages = [
  "English",
  "Hindi",
  "Hinglish",
  "Tamil",
  "Telugu",
  "Kannada",
  "Marathi",
];

const languages = [
  "Afrikaans",
  "Albanian",
  "Amharic",
  "Arabic",
  "Armenian",
  "Assamese",
  "Awadhi",
  "Azerbaijani",
  "Balochi",
  "Bengali",
  "Bhojpuri",
  "Bosnian",
  "Bulgarian",
  "Burmese",
  "Cantonese",
  "Catalan",
  "Chhattisgarhi",
  "Chinese",
  "Croatian",
  "Czech",
  "Danish",
  "Dogri",
  "Dutch",
  "English",
  "Estonian",
  "Farsi",
  "Filipino",
  "Finnish",
  "French",
  "Georgian",
  "German",
  "Greek",
  "Gujarati",
  "Haryanvi",
  "Hausa",
  "Hebrew",
  "Hindi",
  "Hinglish",
  "Hungarian",
  "Icelandic",
  "Igbo",
  "Indonesian",
  "Irish",
  "Italian",
  "Japanese",
  "Javanese",
  "Kannada",
  "Kashmiri",
  "Kazakh",
  "Khmer",
  "Konkani",
  "Korean",
  "Kumaoni",
  "Kurdish",
  "Kutchi",
  "Lao",
  "Latvian",
  "Lithuanian",
  "Maithili",
  "Malay",
  "Malayalam",
  "Mandarin",
  "Manipuri",
  "Marathi",
  "Marwari",
  "Mizo",
  "Nagamese",
  "Nepali",
  "Norwegian",
  "Odia",
  "Pashto",
  "Polish",
  "Portuguese",
  "Punjabi",
  "Rajasthani",
  "Romanian",
  "Russian",
  "Sanskrit",
  "Santali",
  "Serbian",
  "Sindhi",
  "Sinhala",
  "Slovak",
  "Slovenian",
  "Somali",
  "Spanish",
  "Swahili",
  "Swedish",
  "Tagalog",
  "Tamil",
  "Telugu",
  "Thai",
  "Turkish",
  "Ukrainian",
  "Urdu",
  "Uzbek",
  "Vietnamese",
  "Welsh",
  "Xhosa",
  "Yoruba",
  "Zulu",
].sort((first, second) => first.localeCompare(second));

const levels = ["Beginner", "Intermediate", "Advanced"];
const workAreas = [
  "Tone",
  "Clarity",
  "Pronunciation",
  "Pacing",
  "Confidence",
  "Fluency",
  "Articulation",
  "Filler words",
  "Pauses",
  "Intonation",
  "Expression",
  "Vocabulary",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("English");
  const [level, setLevel] = useState("Intermediate");
  const [goal, setGoal] = useState("Interview confidence");
  const [focusAreas, setFocusAreas] = useState(["Tone", "Clarity", "Confidence"]);

  function toggleFocusArea(area: string) {
    setFocusAreas((current) => {
      if (current.includes(area)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== area);
      }

      return [...current, area];
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(
      "vaani-onboarding",
      JSON.stringify({ language, level, goal, focusAreas })
    );
    router.push("/coach");
  }

  return (
    <main className="min-h-screen bg-[#040712] px-5 py-8 text-[#f4fbff] sm:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#040712_0%,#071a36_46%,#0b3765_100%)]" />
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-[#72e2ff]/50 bg-[#72e2ff]/12 font-black text-[#a9f1ff]">
            V
          </span>
          <span className="text-xl font-semibold">Vaani AI</span>
        </Link>
        <Link
          className="rounded-md border border-white/14 px-3 py-2 text-sm font-bold text-[#d7f4ff]"
          href="/login"
        >
          Back
        </Link>
      </div>

      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9f1ff]">
            Step 2
          </p>
          <h1 className="mt-4 text-5xl font-black leading-none sm:text-6xl">
            Tune the coach to your voice goals.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#d7f4ff]/70">
            Vaani adapts prompts and feedback based on the language you want to
            practice and how confident you already feel.
          </p>
        </div>

        <form
          className="rounded-lg border border-[#72e2ff]/16 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]"
          onSubmit={handleSubmit}
        >
          <div>
            <p className="text-sm font-bold text-[#d7f4ff]/80">Language</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {featuredLanguages.map((item) => (
                <button
                  className={`rounded-md border px-4 py-3 text-left font-bold transition ${
                    language === item
                      ? "border-[#72e2ff] bg-[#72e2ff] text-[#04111c]"
                      : "border-white/10 bg-[#06162d] text-[#d7f4ff] hover:border-[#72e2ff]/50"
                  }`}
                  key={item}
                  onClick={() => setLanguage(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="mt-4 grid gap-2">
              <span className="text-sm font-bold text-[#d7f4ff]/60">
                Full language list
              </span>
              <select
                className="rounded-md border border-white/10 bg-[#06162d] px-4 py-4 text-white outline-none transition focus:border-[#72e2ff]/70"
                onChange={(event) => setLanguage(event.target.value)}
                value={language}
              >
                {languages.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-7">
            <p className="text-sm font-bold text-[#d7f4ff]/80">Proficiency</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {levels.map((item) => (
                <button
                  className={`rounded-md border px-4 py-3 text-left font-bold transition ${
                    level === item
                      ? "border-[#2f8cff] bg-[#2f8cff] text-white"
                      : "border-white/10 bg-[#06162d] text-[#d7f4ff] hover:border-[#2f8cff]/50"
                  }`}
                  key={item}
                  onClick={() => setLevel(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-7 grid gap-2">
            <span className="text-sm font-bold text-[#d7f4ff]/80">
              Primary goal
            </span>
            <select
              className="rounded-md border border-white/10 bg-[#06162d] px-4 py-4 text-white outline-none transition focus:border-[#72e2ff]/70"
              onChange={(event) => setGoal(event.target.value)}
              value={goal}
            >
              <option>Interview confidence</option>
              <option>Presentation clarity</option>
              <option>Everyday fluency</option>
              <option>Sales and client calls</option>
            </select>
          </label>

          <div className="mt-7">
            <div className="flex items-end justify-between gap-4">
              <p className="text-sm font-bold text-[#d7f4ff]/80">
                Work areas
              </p>
              <span className="text-xs font-bold text-[#a9f1ff]">
                Choose one or more ({focusAreas.length} selected)
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {workAreas.map((area) => {
                const isSelected = focusAreas.includes(area);

                return (
                  <button
                    className={`rounded-md border px-3 py-2 text-xs font-bold transition-all duration-200 ${
                      isSelected
                        ? "border-[#72e2ff] bg-[#72e2ff] text-[#04111c] shadow-[0_0_15px_rgba(114,226,255,0.4)] scale-[1.02]"
                        : "border-white/10 bg-[#06162d] text-[#d7f4ff]/60 hover:border-[#72e2ff]/50 hover:text-[#d7f4ff]"
                    }`}
                    key={area}
                    onClick={() => toggleFocusArea(area)}
                    type="button"
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          <button className="mt-7 w-full rounded-md bg-[#72e2ff] px-5 py-4 font-black text-[#04111c] transition hover:bg-[#a9f1ff]">
            Open AI coach
          </button>
        </form>
      </section>
    </main>
  );
}
