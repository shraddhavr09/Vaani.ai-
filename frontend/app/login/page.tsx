"use client";

import Link from "next/link";
import { useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

type User = {
  name: string;
  email: string;
  password?: string;
  provider: "email" | "google";
  createdAt?: string;
};

export default function LoginPage() {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");

  const clearCoachData = () => {
    localStorage.removeItem("vaani-onboarding");
    localStorage.removeItem("vaani-sessions");

    Object.keys(localStorage)
      .filter((key) => key.startsWith("vaani-session-"))
      .forEach((key) => localStorage.removeItem(key));
  };

  const resetLearnerState = (profileEmail: string) => {
    const previousProfile = localStorage.getItem("vaani-profile");
    let previousEmail = "";

    try {
      previousEmail = previousProfile
        ? String(JSON.parse(previousProfile)?.email || "")
        : "";
    } catch {
      previousEmail = "";
    }

    if (previousEmail && previousEmail !== profileEmail) {
      clearCoachData();
    }
  };

  const hasOnboarding = () => Boolean(localStorage.getItem("vaani-onboarding"));

  const saveProfile = (profile: User, nextPath: string) => {
    resetLearnerState(profile.email);
    const destination =
      nextPath === "/dashboard" && !hasOnboarding() ? "/onboarding" : nextPath;

    // Check for company sync
    let companyName = (profile as any).companyName || "";
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
            companyName = company.companyName;
          }
        }
      }
    } catch (err) {
      console.error("Company sync check failed", err);
    }

    localStorage.setItem(
      "vaani-profile",
      JSON.stringify({
        ...profile,
        companyName,
        createdAt: profile.createdAt || new Date().toISOString(),
      })
    );
    window.dispatchEvent(new Event("vaani-profile-change"));
    window.location.href = destination;
  };

  const handleSubmit = async () => {
    setError("");

    if (mode === "signup") {
      if (!name || !email || !password) return;

      if (backendUrl) {
        try {
          const response = await fetch(`${backendUrl}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
          });

          if (!response.ok) {
            setError("Could not create your account. Try a different email.");
            return;
          }

          const result = await response.json();
          clearCoachData();
          saveProfile(result.profile, "/onboarding");
          return;
        } catch (err) {
          console.error("Backend signup failed", err);
          setError("Server is unreachable. Try again later or use local mode if available.");
          return;
        }
      }

      clearCoachData();
      const user: User = {
        name,
        email,
        password,
        provider: "email",
        createdAt: new Date().toISOString(),
      };
      saveProfile(user, "/onboarding");
      return;
    }

    if (backendUrl) {
      try {
        const response = await fetch(`${backendUrl}/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          setError("Invalid email or password.");
          return;
        }

        const result = await response.json();
        saveProfile(result.profile, hasOnboarding() ? "/dashboard" : "/onboarding");
        return;
      } catch (err) {
        console.error("Backend signin failed", err);
      }
    }

    const stored = localStorage.getItem("vaani-profile");

    if (!stored) {
      setError("No account found. Please sign up first.");
      return;
    }

    try {
      const profile = JSON.parse(stored);

      if (profile.email !== email || (profile.password && profile.password !== password)) {
        setError("Invalid email or password.");
        return;
      }
      
      saveProfile(profile, hasOnboarding() ? "/dashboard" : "/onboarding");
    } catch {
      setError("Profile data is corrupted. Please sign up again.");
      return;
    }
  };

  const handleGoogleSignIn = () => {
    setError("");
    setIsGoogleLoading(true);

    if (!googleClientId) {
      setIsGoogleLoading(false);
      setError("Google Client ID is missing. Restart the dev server after updating .env.local.");
      return;
    }

    const scriptId = "google-identity-services";
    const startGooglePopup = () => {
      if (!window.google?.accounts?.oauth2) {
        setIsGoogleLoading(false);
        setError("Google sign in could not load. Try again in a moment.");
        return;
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "openid email profile",
        prompt: "select_account",
        callback: async (tokenResponse) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            setIsGoogleLoading(false);
            setError(
              tokenResponse.error_description ||
                "Google sign in was cancelled or could not complete."
            );
            return;
          }

          try {
            const response = await fetch(
              "https://www.googleapis.com/oauth2/v3/userinfo",
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              }
            );

            if (!response.ok) {
              throw new Error("Google profile request failed.");
            }

            const profile = (await response.json()) as {
              name?: string;
              email?: string;
            };

            if (!profile.email) {
              throw new Error("Google did not return an email address.");
            }

            const nextPath = hasOnboarding() ? "/dashboard" : "/onboarding";

            const user: User = {
              name: profile.name || profile.email.split("@")[0],
              email: profile.email,
              provider: "google",
              createdAt: new Date().toISOString(),
            };

            saveProfile(user, nextPath);
          } catch (googleError) {
            setIsGoogleLoading(false);
            setError(
              googleError instanceof Error
                ? googleError.message
                : "Google sign in could not complete."
            );
          }
        },
      });

      tokenClient.requestAccessToken();
    };

    if (document.getElementById(scriptId)) {
      startGooglePopup();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = startGooglePopup;
    script.onerror = () => {
      setIsGoogleLoading(false);
      setError("Google sign in is unavailable right now.");
    };
    document.head.appendChild(script);
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#040712] text-white">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#040712_0%,#071a36_46%,#0b3765_100%)]" />
      <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(114,226,255,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(114,226,255,0.13)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="mx-auto flex w-full max-w-7xl items-center px-6 py-6">
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
        <Link
          className="ml-auto rounded-md border border-cyan-300/20 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/10"
          href="/company-login"
        >
          Company login
        </Link>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 pb-20 pt-6">
        <div className="w-full max-w-md rounded-lg border border-cyan-300/10 bg-white/[0.04] p-8 backdrop-blur-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">
            AI Voice Intelligence
          </p>

          <h2 className="mt-3 text-4xl font-black">
            {mode === "signup" ? "Create your" : "Welcome back to"}
            <span className="block bg-gradient-to-r from-cyan-300 via-blue-400 to-white bg-clip-text text-transparent">
              {mode === "signup" ? "Account" : "Vaani AI"}
            </span>
          </h2>

          <div className="mt-6 flex rounded-md border border-cyan-300/10 bg-white/[0.04] p-1">
            <button
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-[#04111c]"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => {
                setMode("signin");
                setError("");
              }}
              className={`flex-1 rounded-md py-2.5 text-sm font-bold transition ${
                mode === "signin"
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-[#04111c]"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Sign In
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            <button
              className="flex items-center justify-center gap-3 rounded-md border border-cyan-300/15 bg-white/[0.06] px-4 py-3.5 font-black text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09]"
              disabled={isGoogleLoading}
              onClick={handleGoogleSignIn}
              type="button"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-black text-[#04111c]">
                G
              </span>
              {isGoogleLoading ? "Opening Google..." : "Continue with Google"}
            </button>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/45">
              <span className="h-px bg-cyan-300/12" />
              or
              <span className="h-px bg-cyan-300/12" />
            </div>

            {mode === "signup" && (
              <div>
                <label className="mb-2 block text-xs uppercase tracking-widest text-cyan-200/70">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-md border border-cyan-300/15 bg-white/[0.06] px-4 py-3.5 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-cyan-200/70">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-cyan-300/15 bg-white/[0.06] px-4 py-3.5 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-cyan-200/70">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="password"
                className="w-full rounded-md border border-cyan-300/15 bg-white/[0.06] px-4 py-3.5 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50"
              />
            </div>

            {error ? (
              <p className="text-sm font-semibold text-red-400">{error}</p>
            ) : null}

            <button
              onClick={handleSubmit}
              disabled={!email || !password || (mode === "signup" && !name)}
              className="mt-2 rounded-md bg-gradient-to-r from-cyan-400 to-blue-500 py-5 text-lg font-black text-[#04111c] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              {mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
