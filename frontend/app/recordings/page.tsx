"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

type Session = {
  id: string;
  name: string;
  date: string;
  mode: string;
  score: number;
  focus: string;
  source: "gemini" | "local";
  createdAt?: string;
};

type SessionDetails = {
  scores?: Record<string, number>;
  transcript?: string;
  summary?: string;
  drill?: string;
  language?: string;
  level?: string;
  goal?: string;
  duration?: number;
  createdAt?: string;
};

let lastSessionsRaw: string | null = null;
let lastSessionsSnapshot: Session[] = [];

function subscribeToSessions(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("vaani-sessions-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vaani-sessions-change", callback);
  };
}

function parseSessions(raw: string | null) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Session[]) : [];
  } catch {
    return [];
  }
}

function getSessionsSnapshot() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem("vaani-sessions");

  if (raw === lastSessionsRaw) {
    return lastSessionsSnapshot;
  }

  lastSessionsRaw = raw;
  lastSessionsSnapshot = parseSessions(raw);

  return lastSessionsSnapshot;
}

function getServerSessionsSnapshot() {
  return [];
}

function readSessionDetails(id: string): SessionDetails {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(`vaani-session-${id}`);
    return raw ? (JSON.parse(raw) as SessionDetails) : {};
  } catch {
    return {};
  }
}

function dateKey(value: string | undefined) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function getCurrentStreak(dates: string[]) {
  const uniqueDates = new Set(dates.filter(Boolean));
  let streak = 0;
  const cursor = new Date();

  while (uniqueDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getBestStreak(dates: string[]) {
  const sortedDates = Array.from(new Set(dates.filter(Boolean))).sort();
  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const key of sortedDates) {
    const currentDate = new Date(`${key}T00:00:00`);
    const isNextDay =
      previous &&
      Math.round((currentDate.getTime() - previous.getTime()) / 86400000) === 1;

    current = isNextDay ? current + 1 : 1;
    best = Math.max(best, current);
    previous = currentDate;
  }

  return best;
}

function average(values: number[]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (!finiteValues.length) {
    return 0;
  }

  return Math.round(
    finiteValues.reduce((total, value) => total + value, 0) / finiteValues.length
  );
}

export default function RecordingsPage() {
  const sessions = useSyncExternalStore(
    subscribeToSessions,
    getSessionsSnapshot,
    getServerSessionsSnapshot
  );

  const enrichedSessions = useMemo(
    () =>
      sessions.map((session) => {
        const details = readSessionDetails(session.id);

        return {
          ...session,
          details,
          createdAt: session.createdAt || details.createdAt,
        };
      }),
    [sessions]
  );

  const analysis = useMemo(() => {
    const allScores = enrichedSessions.flatMap(({ details }) =>
      Object.entries(details.scores || {}).map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }))
    );
    const scoreNames = Array.from(new Set(allScores.map((score) => score.name)));
    const skillAverages = scoreNames
      .map((name) => ({
        name,
        value: average(
          allScores
            .filter((score) => score.name === name)
            .map((score) => score.value)
        ),
      }))
      .sort((first, second) => second.value - first.value);
    const dates = enrichedSessions.map(({ createdAt }) => dateKey(createdAt));
    const averageScore = average(enrichedSessions.map((session) => session.score));
    const bestSession = enrichedSessions.reduce<Session | null>(
      (best, session) => (!best || session.score > best.score ? session : best),
      null
    );

    return {
      averageScore,
      bestSession,
      currentStreak: getCurrentStreak(dates),
      bestStreak: getBestStreak(dates),
      skillAverages,
      totalDuration: enrichedSessions.reduce(
        (total, session) => total + (Number(session.details.duration) || 0),
        0
      ),
    };
  }, [enrichedSessions]);

  const weakestSkill = analysis.skillAverages.at(-1);
  const strongestSkill = analysis.skillAverages[0];

  return (
    <main className="min-h-screen bg-[#040712] px-5 py-8 text-[#f4fbff] sm:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#040712_0%,#071a36_46%,#0b3765_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(114,226,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(114,226,255,0.13)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Link className="flex items-center gap-3" href="/dashboard">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-[#72e2ff]/50 bg-[#72e2ff]/12 font-black text-[#a9f1ff]">
            V
          </span>
          <span className="text-xl font-semibold">Vaani AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="rounded-md border border-white/14 px-3 py-2 text-sm font-bold text-[#d7f4ff]"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="rounded-md bg-[#72e2ff] px-3 py-2 text-sm font-black text-[#04111c]"
            href="/coach"
          >
            Record
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl py-8">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-lg border border-[#72e2ff]/16 bg-white/[0.045] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9f1ff]">
              Performance
            </p>
            <h1 className="mt-3 text-4xl font-black">
              All recordings and progress
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-[#d7f4ff]/70">
              Your coaching history, streak, score trends, and strongest speech
              skills are calculated from completed recordings on this device.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                ["Average", analysis.averageScore],
                ["Recordings", enrichedSessions.length],
                ["Streak", `${analysis.currentStreak}d`],
                ["Best streak", `${analysis.bestStreak}d`],
              ].map(([label, value]) => (
                <div
                  className="rounded-md border border-white/10 bg-[#06162d] p-4"
                  key={label}
                >
                  <p className="text-sm font-bold text-[#d7f4ff]/62">{label}</p>
                  <p className="mt-2 text-3xl font-black text-[#a9f1ff]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#72e2ff]/16 bg-[#06162d]/90 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9f1ff]">
              Total analysis
            </p>
            <div className="mt-5 grid gap-3">
              <p className="rounded-md border border-white/10 bg-white/[0.04] p-4 leading-7 text-[#d7f4ff]">
                {strongestSkill
                  ? `Your strongest area is ${strongestSkill.name} at ${strongestSkill.value}/100.`
                  : "Complete your first recording to unlock skill analysis."}
              </p>
              <p className="rounded-md border border-white/10 bg-white/[0.04] p-4 leading-7 text-[#d7f4ff]">
                {weakestSkill
                  ? `Next focus: ${weakestSkill.name}. Keep the next take short and deliberate.`
                  : "Your next focus will appear after Vaani has score data."}
              </p>
              <p className="rounded-md border border-white/10 bg-white/[0.04] p-4 leading-7 text-[#d7f4ff]">
                {analysis.totalDuration
                  ? `Total speaking time analyzed: ${Math.round(analysis.totalDuration)} seconds.`
                  : "No speaking time has been logged yet."}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <section className="rounded-lg border border-[#72e2ff]/16 bg-white/[0.045] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9f1ff]">
              Skill averages
            </p>
            <div className="mt-5 grid gap-4">
              {analysis.skillAverages.length ? (
                analysis.skillAverages.slice(0, 10).map(({ name, value }) => (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-white">{name}</span>
                      <span className="font-bold text-[#a9f1ff]">{value}/100</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#72e2ff]"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-white/10 bg-[#06162d] p-4 leading-7 text-[#d7f4ff]/70">
                  Record a session to start building your skill map.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#72e2ff]/16 bg-white/[0.045] p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#a9f1ff]">
                  History
                </p>
                <h2 className="mt-2 text-3xl font-black">Past recordings</h2>
              </div>
              <Link className="text-sm font-bold text-[#a9f1ff]" href="/coach">
                Add recording
              </Link>
            </div>
            <div className="mt-5 grid gap-3">
              {enrichedSessions.length ? (
                enrichedSessions.map((session) => (
                  <article
                    className="grid gap-4 rounded-md border border-white/10 bg-[#06162d] p-4 sm:grid-cols-[1fr_auto]"
                    key={session.id}
                  >
                    <div>
                      <p className="text-lg font-black text-white">
                        {session.name}
                      </p>
                      <p className="mt-1 text-sm text-[#d7f4ff]/52">
                        {session.date} - {session.details.language || "Language"} -{" "}
                        {session.source === "gemini" ? "AI analysis" : "Local report"}
                      </p>
                      <p className="mt-3 leading-7 text-[#d7f4ff]/78">
                        {session.details.summary || session.focus}
                      </p>
                      {session.details.transcript ? (
                        <p className="mt-3 rounded-md border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-[#d7f4ff]/70">
                          {session.details.transcript}
                        </p>
                      ) : null}
                    </div>
                    <div className="grid content-start gap-2 text-right">
                      <span className="grid h-16 w-16 place-items-center rounded-md bg-[#72e2ff]/10 text-xl font-black text-[#a9f1ff]">
                        {session.score}
                      </span>
                      <span className="text-xs font-bold text-[#d7f4ff]/52">
                        {session.details.duration || 0}s
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-md border border-white/10 bg-[#06162d] p-6">
                  <p className="font-black text-white">No recordings yet</p>
                  <p className="mt-2 leading-7 text-[#d7f4ff]/62">
                    Complete your first coach recording and it will appear here
                    with transcript, score, and performance analysis.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
