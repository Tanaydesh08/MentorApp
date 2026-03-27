"use client";

import { loginUser } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const token = await loginUser({ email, password });
      localStorage.setItem("token", String(token));
      router.push("/dashboard");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign in right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-12 sm:px-10 lg:px-12">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
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
              Welcome back
            </p>
            <h1 className="max-w-xl font-[var(--font-space-grotesk)] text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Pick up your mentorship session exactly where it left off.
            </h1>
            <p className="max-w-lg text-base leading-7 text-[var(--muted)]">
              Sign in to access your dashboard, upcoming calls, shared notes, and live coding rooms.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Upcoming mentor calls",
              "Session notes and code history",
              "Secure access for students and mentors",
              "Quick jump into collaboration rooms",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-4 py-4 text-sm text-sky-50/85 backdrop-blur-xl"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/12 bg-[var(--panel-strong)] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-sky-100/70">Sign in</p>
              <h2 className="mt-2 font-[var(--font-space-grotesk)] text-3xl font-semibold text-white">
                Login to MentorSync
              </h2>
            </div>
            <div className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-100">
              Frontend only
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm text-sky-100/80">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-white placeholder:text-slate-400 focus:border-sky-300/50 focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(56,189,248,0.12)]"
                required
              />
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
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--muted)]">
            New here?{" "}
            <Link href="/register" className="font-semibold text-sky-200 hover:text-white">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
