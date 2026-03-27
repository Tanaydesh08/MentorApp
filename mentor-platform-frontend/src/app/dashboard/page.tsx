"use client";

import { getUsers, type UserResponse } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const tasks = [
  "Review the mentor notes before the next call",
  "Resume the pair-programming room for the React module",
  "Upload the latest code snapshot for feedback",
];

function readEmailFromToken(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return "";
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    const parsed = JSON.parse(decoded) as { sub?: string };
    return parsed.sub ?? "";
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    setCurrentEmail(readEmailFromToken(token));

    const loadUsers = async () => {
      try {
        const response = await getUsers(token);
        setUsers(response);
        setError("");
      } catch (caughtError) {
        setUsers([]);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load user data.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, [router]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-10 sm:px-10 lg:px-12">
      <section className="rounded-[36px] border border-white/12 bg-[var(--panel-strong)] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <p className="font-[var(--font-space-grotesk)] text-sm uppercase tracking-[0.3em] text-sky-200/65">
              Dashboard
            </p>
            <div>
              <h1 className="font-[var(--font-space-grotesk)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Collaboration and user data in one view.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--muted)]">
                This dashboard loads real user data from your Spring Boot API after login,
                using the JWT saved in local storage.
              </p>
              {currentEmail ? (
                <p className="mt-3 text-sm text-sky-100/75">
                  Signed in as <span className="font-semibold text-white">{currentEmail}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white/8 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-white/12"
            >
              Home
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                router.push("/login");
              }}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-sky-100"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-white/10 bg-slate-950/45 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-sky-100/65">Users from API</p>
                <h2 className="mt-2 font-[var(--font-space-grotesk)] text-3xl font-semibold text-white">
                  Spring Boot user list
                </h2>
              </div>
              <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-100">
                GET /api/users
              </span>
            </div>

            <div className="mt-6">
              {isLoading ? (
                <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-sky-50/85">
                  Loading users...
                </div>
              ) : null}

              {!isLoading && error ? (
                <div className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-7 text-amber-50">
                  {error}
                  <div className="mt-3 text-amber-100/80">
                    Your backend security currently allows only <span className="font-semibold">MENTOR</span> to access this endpoint.
                  </div>
                </div>
              ) : null}

              {!isLoading && !error ? (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.email}
                      className="flex items-center justify-between rounded-3xl border border-white/8 bg-white/5 px-5 py-4"
                    >
                      <div>
                        <p className="text-base font-semibold text-white">{user.email}</p>
                        <p className="text-sm text-[var(--muted)]">User account from Spring Boot</p>
                      </div>
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-[28px] border border-sky-300/15 bg-sky-300/8 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-sky-100">API status</p>
                  <p className="text-sm text-sky-100/70">
                    The dashboard reads the token from local storage and sends it as a Bearer token.
                  </p>
                </div>
                <span className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                  {users.length} users loaded
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/6 p-6">
            <p className="text-sm text-sky-100/65">Today&apos;s checklist</p>
            <div className="mt-4 space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={task}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-slate-950/35 px-4 py-3"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-300/15 text-xs font-semibold text-sky-100">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-7 text-sky-50/90">{task}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
