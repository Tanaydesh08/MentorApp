"use client";

import { registerUser } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "MENTOR">("STUDENT");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await registerUser({ email, password, role });
      router.push("/login");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create your account right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-12 sm:px-10 lg:px-12">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="rounded-[32px] border border-white/12 bg-[var(--panel-strong)] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 space-y-3">
            <p className="text-sm text-sky-100/70">Create your account</p>
            <h1 className="font-[var(--font-space-grotesk)] text-3xl font-semibold text-white sm:text-4xl">
              Join the collaboration workspace.
            </h1>
            <p className="max-w-lg text-sm leading-7 text-[var(--muted)]">
              Register as a mentor or student and get immediate access to your live session dashboard.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm text-sky-100/80">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-sky-300/50 focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.12)]"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-sky-100/80">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-sky-300/50 focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.12)]"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-sky-100/80">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "STUDENT" | "MENTOR")}
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-white focus:border-sky-300/50 focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.12)]"
              >
                <option value="STUDENT" className="bg-slate-950">
                  Student
                </option>
                <option value="MENTOR" className="bg-slate-950">
                  Mentor
                </option>
              </select>
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-950 shadow-[0_18px_50px_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoading ? "Creating account..." : "Register"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--muted)]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-sky-200 hover:text-white">
              Login here
            </Link>
          </p>
        </section>

        <section className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-sky-100/75 hover:text-white"
          >
            <span className="text-base">&lt;-</span>
            Back to home
          </Link>
          <div className="space-y-4">
            <p className="font-[var(--font-space-grotesk)] text-sm uppercase tracking-[0.3em] text-sky-200/65">
              Smooth onboarding
            </p>
            <h2 className="max-w-xl font-[var(--font-space-grotesk)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Start mentoring sessions with a dashboard built for clarity.
            </h2>
            <p className="max-w-xl text-base leading-7 text-[var(--muted)]">
              The interface is tuned for scheduling, session prep, and jumping into live collaboration without friction.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "Calendar-aware sessions",
                text: "Keep upcoming lessons, availability, and reminders visible in one place.",
              },
              {
                title: "Video and audio ready",
                text: "Join live conversations with your mentor or student as soon as the session starts.",
              },
              {
                title: "Code review friendly",
                text: "Track shared coding work, iteration history, and lesson outcomes in a focused workspace.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 backdrop-blur-xl"
              >
                <h3 className="font-[var(--font-space-grotesk)] text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
