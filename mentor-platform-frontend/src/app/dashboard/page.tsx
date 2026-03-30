"use client";

import {
  clearStoredToken,
  createSessionId,
  isMentorRole,
  readEmailFromToken,
  readRoleFromToken,
  useStoredToken,
} from "@/lib/auth";
import { getUsers, type UserResponse } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const tasks = [
  "Review the mentor notes before the next call",
  "Resume the pair-programming room for the React module",
  "Upload the latest code snapshot for feedback",
];

export default function DashboardPage() {
  const router = useRouter();
  const token = useStoredToken();
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [sessionInput, setSessionInput] = useState("");
  const currentEmail = readEmailFromToken(token);
  const currentRole = readRoleFromToken(token);
  const showUsersApi = Boolean(token);
  const mentorView = isMentorRole(currentRole);
  const visibleUsers = users;

  const createSession = () => {
    router.push(`/session/${createSessionId()}`);
  };

  const joinSession = () => {
    const sessionId = sessionInput.trim().toLowerCase();

    if (!sessionId) {
      return;
    }

    router.push(`/session/${sessionId}`);
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      setUsers([]);
      setError("");
      setIsLoading(false);
      return;
    }

    if (!showUsersApi) {
      setUsers([]);
      setError("");
      setIsLoading(false);
      return;
    }

    const loadUsers = async () => {
      setIsLoading(true);

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
  }, [router, showUsersApi, token]);

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
                  {currentRole ? (
                    <>
                      {" "}
                      <span className="text-sky-100/45">|</span>{" "}
                      <span className="font-semibold text-sky-100">{currentRole}</span>
                    </>
                  ) : null}
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
                clearStoredToken();
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
            <div className="mb-6 rounded-[28px] border border-sky-300/15 bg-sky-300/8 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm text-sky-100">Session management</p>
                  <h2 className="mt-2 font-[var(--font-space-grotesk)] text-3xl font-semibold text-white">
                    Create or join a live room
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-sky-100/70">
                    Create a fresh session id for a new mentoring room, or jump into an existing session using a shared code.
                  </p>
                </div>

                <button
                  onClick={createSession}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Create Session
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={sessionInput}
                  onChange={(event) => setSessionInput(event.target.value)}
                  placeholder="Enter session id, for example abc123"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-white focus:border-sky-300/50 focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.12)]"
                />
                <button
                  onClick={joinSession}
                  className="rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:-translate-y-0.5 hover:bg-sky-100"
                >
                  Join Session
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-sky-100/65">Users from API</p>
                <h2 className="mt-2 font-[var(--font-space-grotesk)] text-3xl font-semibold text-white">
                  {mentorView ? "Users available for mentoring" : "Users in the platform"}
                </h2>
              </div>
              {token ? (
                <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-100">
                  GET /api/users
                </span>
              ) : null}
            </div>

            <div className="mt-6">
              {isLoading ? (
                <div className="rounded-3xl border border-white/8 bg-white/5 p-5 text-sm text-sky-50/85">
                  Loading users...
                </div>
              ) : null}

              {!isLoading && showUsersApi && error ? (
                <div className="rounded-3xl border border-amber-300/20 bg-amber-400/10 p-5 text-sm leading-7 text-amber-50">
                  {error}
                  <div className="mt-3 text-amber-100/80">
                    The frontend is calling the users endpoint with the saved JWT. If this stays visible, the backend security rule still needs to allow authenticated users.
                  </div>
                </div>
              ) : null}

              {!isLoading && showUsersApi && !error ? (
                <div className="space-y-3">
                  {visibleUsers.map((user) => (
                    <div
                      key={user.email}
                      className="flex items-center justify-between rounded-3xl border border-white/8 bg-white/5 px-5 py-4"
                    >
                      <div>
                        <p className="text-base font-semibold text-white">{user.email}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {mentorView ? "Invite-ready platform user" : "Authenticated platform user"}
                        </p>
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
                    The dashboard reads the token from local storage and sends it as a Bearer token for every logged-in user.
                  </p>
                </div>
                <span className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                  {showUsersApi ? `${visibleUsers.length} users loaded` : "Login required"}
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

            <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <p className="text-sm text-sky-100/65">Workspace rollout</p>
              <div className="mt-4 space-y-3">
                {[
                  "Session route added at /session/[sessionId]",
                  "Invite link flow works through session ids",
                  "Session workspace now uses a Meet-style layout with working local media controls",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-sky-50/90"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
