"use client";

import Link from "next/link";
import { useState } from "react";

type CompanyProfile = {
  companyName: string;
  adminName: string;
  email: string;
  password: string;
  createdAt: string;
};

function readCompanyProfile() {
  try {
    const stored = window.localStorage.getItem("vaani-company-profile");
    return stored ? (JSON.parse(stored) as CompanyProfile) : null;
  } catch {
    return null;
  }
}

export default function CompanyLoginPage() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function saveCompany(profile: CompanyProfile) {
    window.localStorage.setItem("vaani-company-profile", JSON.stringify(profile));
    window.dispatchEvent(new Event("vaani-company-change"));
    window.location.href = "/company-dashboard";
  }

  function handleSubmit() {
    setError("");

    if (mode === "signup") {
      if (!companyName || !adminName || !email || !password) {
        setError("Fill in every company account field.");
        return;
      }

      saveCompany({
        companyName,
        adminName,
        email,
        password,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    const stored = readCompanyProfile();

    if (!stored) {
      setError("No company account found. Create one first.");
      return;
    }

    if (stored.email !== email || stored.password !== password) {
      setError("Invalid company email or password.");
      return;
    }

    window.location.href = "/company-dashboard";
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#050712] text-white">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(128deg,#050712_0%,#0b1324_44%,#12313a_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(110,231,216,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(248,113,113,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid h-11 w-11 place-items-center rounded-md border border-[#6ee7d8]/40 bg-[#6ee7d8]/10 font-black text-[#9ff5ec]">
            V
          </span>
          <span className="text-xl font-bold">Vaani AI</span>
        </Link>
        <Link
          className="rounded-md border border-white/14 px-4 py-2 text-sm font-bold text-white/75 transition hover:bg-white/10"
          href="/login"
        >
          Learner login
        </Link>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-lg rounded-lg border border-[#6ee7d8]/14 bg-white/[0.045] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
            Company access
          </p>
          <h1 className="mt-3 text-4xl font-black">
            {mode === "signup" ? "Create company workspace" : "Open company dashboard"}
          </h1>

          <div className="mt-6 grid grid-cols-2 rounded-md border border-white/10 bg-white/[0.04] p-1">
            {(["signup", "signin"] as const).map((item) => (
              <button
                className={`rounded-md py-2.5 text-sm font-black transition ${
                  mode === item
                    ? "bg-[#6ee7d8] text-[#061117]"
                    : "text-white/54 hover:text-white"
                }`}
                key={item}
                onClick={() => {
                  setMode(item);
                  setError("");
                }}
                type="button"
              >
                {item === "signup" ? "Sign Up" : "Sign In"}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4">
            {mode === "signup" ? (
              <>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#d8eff2]/70">
                    Company name
                  </span>
                  <input
                    className="rounded-md border border-white/10 bg-[#07101d] px-4 py-3.5 outline-none transition placeholder:text-white/30 focus:border-[#6ee7d8]/60"
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Acme Learning"
                    value={companyName}
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#d8eff2]/70">
                    Admin name
                  </span>
                  <input
                    className="rounded-md border border-white/10 bg-[#07101d] px-4 py-3.5 outline-none transition placeholder:text-white/30 focus:border-[#6ee7d8]/60"
                    onChange={(event) => setAdminName(event.target.value)}
                    placeholder="Your name"
                    value={adminName}
                  />
                </label>
              </>
            ) : null}

            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#d8eff2]/70">
                Work email
              </span>
              <input
                className="rounded-md border border-white/10 bg-[#07101d] px-4 py-3.5 outline-none transition placeholder:text-white/30 focus:border-[#6ee7d8]/60"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@company.com"
                type="email"
                value={email}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#d8eff2]/70">
                Password
              </span>
              <input
                className="rounded-md border border-white/10 bg-[#07101d] px-4 py-3.5 outline-none transition placeholder:text-white/30 focus:border-[#6ee7d8]/60"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="password"
                type="password"
                value={password}
              />
            </label>

            {error ? <p className="text-sm font-bold text-[#fca5a5]">{error}</p> : null}

            <button
              className="rounded-md bg-[#6ee7d8] px-5 py-4 font-black text-[#061117] transition hover:bg-[#9ff5ec]"
              onClick={handleSubmit}
              type="button"
            >
              {mode === "signup" ? "Create workspace" : "Open dashboard"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
