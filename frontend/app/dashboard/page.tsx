"use client";

import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";

type Profile = {
  name: string;
  email: string;
  companyName?: string;
  provider?: "email" | "google";
  createdAt?: string;
};

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

let lastProfileRaw: string | null = null;
let lastProfileSnapshot: Profile | null = null;
let lastSessionsRaw: string | null = null;
let lastSessionsSnapshot: Session[] = [];

function parseProfile(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

function subscribeToProfile(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("vaani-profile-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vaani-profile-change", callback);
  };
}

function getProfileSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem("vaani-profile");

  if (raw === lastProfileRaw) {
    return lastProfileSnapshot;
  }

  lastProfileRaw = raw;
  lastProfileSnapshot = parseProfile(raw);

  return lastProfileSnapshot;
}

function getServerProfileSnapshot() {
  return null;
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

function subscribeToSessions(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("vaani-sessions-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vaani-sessions-change", callback);
  };
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

function subscribeToHydration() {
  return () => {};
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

export default function DashboardPage() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  );
  const profile = useSyncExternalStore(
    subscribeToProfile,
    getProfileSnapshot,
    getServerProfileSnapshot
  );
  const sessions = useSyncExternalStore(
    subscribeToSessions,
    getSessionsSnapshot,
    getServerSessionsSnapshot
  );
  const latestSession = sessions[0];
  const skillScores = useMemo(() => {
    if (!latestSession || typeof window === "undefined") {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(`vaani-session-${latestSession.id}`);
      const details = stored ? JSON.parse(stored) : null;
      const scores = details?.scores || {};

      return Object.entries(scores)
        .slice(0, 6)
        .map(([title, value]) => ({
          title,
          value: Number(value) || 0,
        }));
    } catch {
      return [];
    }
  }, [latestSession]);

  useEffect(() => {
    if (!isHydrated || profile) {
      return;
    }

    const redirect = window.setTimeout(() => {
      if (!window.localStorage.getItem("vaani-profile")) {
        window.location.replace("/login");
      }
    }, 250);

    return () => window.clearTimeout(redirect);
  }, [isHydrated, profile]);

  useEffect(() => {
    if (!isHydrated || !profile) {
      return;
    }

    if (!window.localStorage.getItem("vaani-onboarding")) {
      window.location.replace("/onboarding");
    }
  }, [isHydrated, profile]);

  useEffect(() => {
    if (!isHydrated || !profile || profile.companyName) {
      return;
    }

    // Try to sync company if not already set
    try {
      const companyRaw = localStorage.getItem("vaani-company-profile");
      const employeesRaw = localStorage.getItem("vaani-company-employees");
      
      if (companyRaw && employeesRaw) {
        const company = JSON.parse(companyRaw);
        const employees = JSON.parse(employeesRaw);
        
        if (Array.isArray(employees)) {
          const isEmployee = employees.some(
            (emp: any) => emp.email.toLowerCase() === profile.email.toLowerCase()
          );
          
          if (isEmployee) {
            const updatedProfile = { ...profile, companyName: company.companyName };
            localStorage.setItem("vaani-profile", JSON.stringify(updatedProfile));
            // Trigger a re-render by dispatching the event
            window.dispatchEvent(new Event("vaani-profile-change"));
          }
        }
      }
    } catch (err) {
      // Ignore sync errors in dashboard
    }
  }, [isHydrated, profile]);

  if (!isHydrated || !profile) return null;

  const hasSessions = sessions.length > 0;
  const averageScore = hasSessions
    ? Math.round(
        sessions.reduce((total, session) => total + session.score, 0) /
          sessions.length
      )
    : 0;
  const bestSession = hasSessions
    ? sessions.reduce((best, session) =>
        session.score > best.score ? session : best
      )
    : null;
  const joinedToday = profile.createdAt
    ? new Date(profile.createdAt).toDateString() === new Date().toDateString()
    : !hasSessions;
  const coachHref =
    typeof window !== "undefined" && window.localStorage.getItem("vaani-onboarding")
      ? "/coach"
      : "/onboarding";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#040712] text-white">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#040712_0%,#071a36_46%,#0b3765_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(114,226,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(114,226,255,0.13)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link className="flex items-center gap-3" href="/">
          <div className="grid h-11 w-11 place-items-center rounded-md border border-cyan-300/30 bg-cyan-400/10 font-black text-cyan-200">
            V
          </div>
          <div>
            <h1 className="text-xl font-bold">Vaani AI</h1>
            <p className="text-xs text-cyan-200/60">
              Be the voice of the future
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="rounded-md border border-cyan-300/20 bg-white/5 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/10"
            href="/recordings"
          >
            Progress
          </Link>
          <Link
            className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-black text-[#04111c] transition hover:bg-cyan-100"
            href={coachHref}
          >
            Open coach
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("vaani-profile");
              window.dispatchEvent(new Event("vaani-profile-change"));
              window.location.replace("/login");
            }}
            className="rounded-md border border-cyan-300/20 bg-white/5 px-5 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/10"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-cyan-300/10 bg-white/[0.04] p-8 backdrop-blur-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
              AI Voice Intelligence
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight">
              {joinedToday ? "Welcome" : "Welcome back"}, {profile.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-cyan-200/55">
                {profile.email || "Google account"}{" "}
                {profile.provider === "google" ? "via Google" : ""}
              </p>
              {profile.companyName && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                  🏢 {profile.companyName} Member
                </span>
              )}
            </div>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
              {hasSessions
                ? "Your dashboard shows your real coaching history from completed recordings."
                : "Record your first coaching clip to unlock scores, trends, and personalized drills."}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Average score", averageScore],
                ["Best take", bestSession?.score || 0],
                ["Sessions", sessions.length],
              ].map(([label, value]) => (
                <div
                  className="rounded-md border border-white/10 bg-[#06162d] p-5"
                  key={label}
                >
                  <p className="text-sm font-bold text-cyan-200/62">{label}</p>
                  <p className="mt-2 text-4xl font-black text-cyan-200">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-cyan-300/10 bg-[#06162d]/90 p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
              Next drill
            </p>
            <h2 className="mt-3 text-3xl font-black">
              {hasSessions ? "Keep improving" : "Start your first take"}
            </h2>
            <p className="mt-4 leading-7 text-white/70">
              {hasSessions
                ? latestSession.focus
                : "Record a 20-second answer so Vaani can create your first real coaching report."}
            </p>
            <Link
              className="mt-7 inline-flex rounded-md bg-cyan-300 px-5 py-4 font-black text-[#04111c] transition hover:bg-cyan-100"
              href={coachHref}
            >
              Practice now
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <section className="rounded-lg border border-cyan-300/10 bg-white/[0.04] p-7 backdrop-blur-xl">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
              Skill map
            </p>
            <div className="mt-6 grid gap-5">
              {skillScores.length ? skillScores.map(({ title, value }) => (
                <div key={title}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white">{title}</span>
                    <span className="font-bold text-cyan-200">{value}/100</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              )) : (
                <p className="rounded-md border border-white/10 bg-[#06162d] p-4 leading-7 text-white/62">
                  No score map yet. Complete a coach recording to fill this with
                  your actual AI analysis.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-cyan-300/10 bg-white/[0.04] p-7 backdrop-blur-2xl">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
                  Recent sessions
                </p>
                <h2 className="mt-3 text-3xl font-black">Your recordings</h2>
              </div>
              <Link className="text-sm font-bold text-cyan-200" href={coachHref}>
                Record new session
              </Link>
            </div>
            <div className="mt-6 grid gap-3">
              {hasSessions ? sessions.map(({ id, name, date, score, mode, focus, source }) => (
                <div
                  key={id}
                  className="grid gap-4 rounded-md border border-cyan-300/10 bg-[#06162d] px-5 py-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-black text-white">{name}</p>
                    <p className="mt-1 text-sm text-white/48">
                      {date} - {mode} - {source === "gemini" ? "AI analysis" : "Local report"}
                    </p>
                    <p className="mt-2 text-sm text-cyan-100/70">{focus}</p>
                  </div>
                  <span className="grid h-14 w-14 place-items-center rounded-md bg-cyan-400/10 text-lg font-black text-cyan-300">
                    {score}
                  </span>
                </div>
              )) : (
                <div className="rounded-md border border-cyan-300/10 bg-[#06162d] p-6">
                  <p className="font-black text-white">No recordings yet</p>
                  <p className="mt-2 leading-7 text-white/62">
                    Your first completed coach analysis will appear here.
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
