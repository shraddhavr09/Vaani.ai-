"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type CompanyProfile = {
  companyName: string;
  adminName: string;
  email: string;
  createdAt: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  scores: Record<string, number>;
  notes: string;
  updatedAt?: string;
};

const scoreAreas = [
  "Clarity",
  "Confidence",
  "Pronunciation",
  "Pacing",
  "Fluency",
  "Tone",
];

let lastCompanyRaw: string | null = null;
let lastCompanySnapshot: CompanyProfile | null = null;
let lastEmployeesRaw: string | null = null;
let lastEmployeesSnapshot: Employee[] = [];

function subscribeToCompany(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("vaani-company-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vaani-company-change", callback);
  };
}

function getCompanySnapshot() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem("vaani-company-profile");

  if (raw === lastCompanyRaw) return lastCompanySnapshot;

  lastCompanyRaw = raw;

  try {
    lastCompanySnapshot = raw ? (JSON.parse(raw) as CompanyProfile) : null;
  } catch {
    lastCompanySnapshot = null;
  }

  return lastCompanySnapshot;
}

function getServerCompanySnapshot() {
  return null;
}

function subscribeToEmployees(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("vaani-employees-change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("vaani-employees-change", callback);
  };
}

function getEmployeesSnapshot() {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem("vaani-company-employees");

  if (raw === lastEmployeesRaw) return lastEmployeesSnapshot;

  lastEmployeesRaw = raw;

  try {
    const parsed = raw ? JSON.parse(raw) : [];
    lastEmployeesSnapshot = Array.isArray(parsed) ? (parsed as Employee[]) : [];
  } catch {
    lastEmployeesSnapshot = [];
  }

  return lastEmployeesSnapshot;
}

function getServerEmployeesSnapshot() {
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

function getAverage(scores: Record<string, number>) {
  const values = scoreAreas
    .map((area) => Number(scores[area]))
    .filter((score) => Number.isFinite(score) && score > 0);

  if (!values.length) return 0;

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function getStrongAreas(scores: Record<string, number>) {
  return scoreAreas.filter((area) => Number(scores[area]) >= 80);
}

function getImprovementAreas(scores: Record<string, number>) {
  return scoreAreas.filter((area) => {
    const score = Number(scores[area]);
    return Number.isFinite(score) && score > 0 && score < 70;
  });
}

function saveEmployees(employees: Employee[]) {
  window.localStorage.setItem("vaani-company-employees", JSON.stringify(employees));
  window.dispatchEvent(new Event("vaani-employees-change"));
}

export default function CompanyDashboardPage() {
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  );
  const company = useSyncExternalStore(
    subscribeToCompany,
    getCompanySnapshot,
    getServerCompanySnapshot
  );
  const employees = useSyncExternalStore(
    subscribeToEmployees,
    getEmployeesSnapshot,
    getServerEmployeesSnapshot
  );
  const [selectedId, setSelectedId] = useState("");
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    email: "",
    department: "",
    role: "",
  });
  const [scoreDraft, setScoreDraft] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const selectedEmployee =
    employees.find((employee) => employee.id === selectedId) || employees[0];

  const companyAverage = employees.length
    ? Math.round(
        employees.reduce((total, employee) => total + getAverage(employee.scores), 0) /
          employees.length
      )
    : 0;
  const needsCoaching = employees.filter(
    (employee) => getImprovementAreas(employee.scores).length > 0
  ).length;
  const topEmployee = employees.reduce<Employee | null>((top, employee) => {
    if (!top) return employee;
    return getAverage(employee.scores) > getAverage(top.scores) ? employee : top;
  }, null);

  const selectedStrongAreas = useMemo(
    () => (selectedEmployee ? getStrongAreas(selectedEmployee.scores) : []),
    [selectedEmployee]
  );
  const selectedImprovementAreas = useMemo(
    () => (selectedEmployee ? getImprovementAreas(selectedEmployee.scores) : []),
    [selectedEmployee]
  );

  useEffect(() => {
    if (!isHydrated || company) return;

    const redirect = window.setTimeout(() => {
      if (!window.localStorage.getItem("vaani-company-profile")) {
        window.location.replace("/company-login");
      }
    }, 250);

    return () => window.clearTimeout(redirect);
  }, [company, isHydrated]);

  if (!isHydrated || !company) return null;

  const visibleScores =
    selectedId && selectedEmployee?.id === selectedId
      ? scoreDraft
      : selectedEmployee?.scores || {};
  const visibleNotes =
    selectedId && selectedEmployee?.id === selectedId
      ? notes
      : selectedEmployee?.notes || "";

  function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!employeeForm.name || !employeeForm.email) return;

    const employee: Employee = {
      id: `employee-${Date.now()}`,
      name: employeeForm.name,
      email: employeeForm.email,
      department: employeeForm.department || "General",
      role: employeeForm.role || "Employee",
      scores: {},
      notes: "",
      updatedAt: new Date().toISOString(),
    };

    saveEmployees([employee, ...employees]);
    setSelectedId(employee.id);
    setScoreDraft(employee.scores);
    setNotes(employee.notes);
    setEmployeeForm({ name: "", email: "", department: "", role: "" });
  }

  function saveScorecard() {
    if (!selectedEmployee) return;

    saveEmployees(
      employees.map((employee) =>
        employee.id === selectedEmployee.id
              ? {
                  ...employee,
              scores: visibleScores,
              notes: visibleNotes,
              updatedAt: new Date().toISOString(),
            }
          : employee
      )
    );
  }

  function removeEmployee(id: string) {
    saveEmployees(employees.filter((employee) => employee.id !== id));
    setSelectedId("");
    setScoreDraft({});
    setNotes("");
  }

  return (
    <main className="min-h-screen bg-[#050712] px-5 py-6 text-white sm:px-8">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(128deg,#050712_0%,#0b1324_44%,#12313a_100%)]" />
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-[#6ee7d8]/40 bg-[#6ee7d8]/10 font-black text-[#9ff5ec]">
            V
          </span>
          <span className="text-xl font-bold">Vaani AI</span>
        </Link>
        <button
          className="rounded-md border border-white/14 px-4 py-2 text-sm font-bold text-white/72 transition hover:bg-white/10"
          onClick={() => {
            window.localStorage.removeItem("vaani-company-profile");
            window.dispatchEvent(new Event("vaani-company-change"));
            window.location.replace("/company-login");
          }}
          type="button"
        >
          Logout
        </button>
      </div>

      <section className="mx-auto max-w-7xl py-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-lg border border-[#6ee7d8]/14 bg-white/[0.045] p-7">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
              Company dashboard
            </p>
            <h1 className="mt-3 text-5xl font-black">{company.companyName}</h1>
            <p className="mt-3 text-[#d8eff2]/66">
              Managed by {company.adminName} · {company.email}
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Employees", employees.length],
                ["Team average", companyAverage],
                ["Need coaching", needsCoaching],
              ].map(([label, value]) => (
                <div className="rounded-md border border-white/10 bg-[#07101d] p-5" key={label}>
                  <p className="text-sm font-bold text-[#d8eff2]/60">{label}</p>
                  <p className="mt-2 text-4xl font-black text-[#9ff5ec]">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <form
            className="rounded-lg border border-[#6ee7d8]/14 bg-[#07101d] p-7"
            onSubmit={addEmployee}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
              Add employee
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["name", "Name", "Priya Sharma"],
                ["email", "Email", "priya@company.com"],
                ["department", "Department", "Sales"],
                ["role", "Role", "Account executive"],
              ].map(([key, label, placeholder]) => (
                <label className="grid gap-2" key={key}>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#d8eff2]/62">
                    {label}
                  </span>
                  <input
                    className="rounded-md border border-white/10 bg-[#050712] px-3 py-3 outline-none transition placeholder:text-white/28 focus:border-[#6ee7d8]/60"
                    onChange={(event) =>
                      setEmployeeForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    placeholder={placeholder}
                    value={employeeForm[key as keyof typeof employeeForm]}
                  />
                </label>
              ))}
            </div>
            <button className="mt-5 rounded-md bg-[#6ee7d8] px-5 py-3 font-black text-[#061117]">
              Add employee
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="rounded-lg border border-[#6ee7d8]/14 bg-white/[0.045] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
                  Employees
                </p>
                <p className="mt-2 text-sm text-[#d8eff2]/62">
                  Select a person to edit their scorecard.
                </p>
              </div>
              {topEmployee ? (
                <span className="rounded-md bg-[#6ee7d8]/10 px-3 py-2 text-sm font-bold text-[#9ff5ec]">
                  Top: {topEmployee.name}
                </span>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3">
              {employees.length ? (
                employees.map((employee) => {
                  const average = getAverage(employee.scores);
                  const isSelected = selectedEmployee?.id === employee.id;

                  return (
                    <button
                      className={`rounded-md border p-4 text-left transition ${
                        isSelected
                          ? "border-[#6ee7d8] bg-[#6ee7d8]/10"
                          : "border-white/10 bg-[#07101d] hover:border-[#6ee7d8]/45"
                      }`}
                      key={employee.id}
                      onClick={() => {
                        setSelectedId(employee.id);
                        setScoreDraft(employee.scores);
                        setNotes(employee.notes);
                      }}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black">{employee.name}</p>
                          <p className="mt-1 text-sm text-[#d8eff2]/58">
                            {employee.role} · {employee.department}
                          </p>
                        </div>
                        <span className="grid h-12 w-12 place-items-center rounded-md bg-[#6ee7d8]/10 font-black text-[#9ff5ec]">
                          {average || "-"}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-md border border-white/10 bg-[#07101d] p-5">
                  <p className="font-black">No employees yet</p>
                  <p className="mt-2 leading-7 text-[#d8eff2]/62">
                    Add your team first. Scorecards will appear here without
                    fake sample data.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#6ee7d8]/14 bg-white/[0.045] p-6">
            {selectedEmployee ? (
              <>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9ff5ec]">
                      Employee scorecard
                    </p>
                    <h2 className="mt-2 text-4xl font-black">{selectedEmployee.name}</h2>
                    <p className="mt-2 text-[#d8eff2]/62">
                      {selectedEmployee.email} · {selectedEmployee.role}
                    </p>
                  </div>
                  <button
                    className="rounded-md border border-[#f87171]/35 px-4 py-2 text-sm font-bold text-[#fca5a5] transition hover:bg-[#f87171]/10"
                    onClick={() => removeEmployee(selectedEmployee.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {scoreAreas.map((area) => (
                    <label className="rounded-md border border-white/10 bg-[#07101d] p-4" key={area}>
                      <span className="flex items-center justify-between text-sm font-bold text-[#d8eff2]/72">
                        {area}
                        <span className="text-[#9ff5ec]">{scoreDraft[area] || 0}/100</span>
                      </span>
                      <input
                        className="mt-4 w-full accent-[#6ee7d8]"
                        max="100"
                        min="0"
                        onChange={(event) =>
                          setScoreDraft((current) => ({
                            ...visibleScores,
                            ...current,
                            [area]: Number(event.target.value),
                          }))
                        }
                        type="range"
                        value={visibleScores[area] || 0}
                      />
                    </label>
                  ))}
                </div>

                <label className="mt-5 grid gap-2">
                  <span className="text-sm font-bold text-[#d8eff2]/72">
                    Manager notes
                  </span>
                  <textarea
                    className="min-h-28 rounded-md border border-white/10 bg-[#07101d] px-4 py-3 outline-none transition placeholder:text-white/28 focus:border-[#6ee7d8]/60"
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Add coaching context, recent wins, or next actions."
                    value={visibleNotes}
                  />
                </label>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-4">
                    <p className="font-black text-emerald-200">Doing well</p>
                    <p className="mt-2 leading-7 text-emerald-50/76">
                      {selectedStrongAreas.length
                        ? selectedStrongAreas.join(", ")
                        : "No strong areas scored yet."}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#f87171]/25 bg-[#f87171]/10 p-4">
                    <p className="font-black text-[#fca5a5]">Needs improvement</p>
                    <p className="mt-2 leading-7 text-[#ffe4e4]/76">
                      {selectedImprovementAreas.length
                        ? selectedImprovementAreas.join(", ")
                        : "No improvement areas scored yet."}
                    </p>
                  </div>
                </div>

                <button
                  className="mt-5 rounded-md bg-[#6ee7d8] px-5 py-3 font-black text-[#061117] transition hover:bg-[#9ff5ec]"
                  onClick={saveScorecard}
                  type="button"
                >
                  Save scorecard
                </button>
              </>
            ) : (
              <div className="rounded-md border border-white/10 bg-[#07101d] p-6">
                <p className="font-black">Select an employee</p>
                <p className="mt-2 leading-7 text-[#d8eff2]/62">
                  Add an employee to start tracking clarity, confidence,
                  pronunciation, pacing, fluency, and tone.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
