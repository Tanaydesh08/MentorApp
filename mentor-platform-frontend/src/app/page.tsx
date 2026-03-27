import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative isolate overflow-hidden">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/6 px-4 py-2 text-sm text-sky-100 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[var(--brand)] shadow-[0_0_18px_var(--glow)]" />
              Mentor and student collaboration, redesigned
            </div>

            <div className="space-y-5">
              <p className="font-[var(--font-space-grotesk)] text-sm uppercase tracking-[0.35em] text-sky-200/70">
                MentorSync
              </p>
              <h1 className="max-w-3xl font-[var(--font-space-grotesk)] text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Learn face-to-face while writing code in the same room.
              </h1>
              <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                A polished workspace for mentors and students to schedule live sessions,
                jump into video calls, and collaborate on code without switching tools.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-slate-950 shadow-[0_18px_50px_rgba(255,255,255,0.18)] hover:-translate-y-0.5 hover:bg-sky-100"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white/8 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-md hover:-translate-y-0.5 hover:border-sky-200/40 hover:bg-white/12"
              >
                Sign in
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { value: "Live", label: "Audio + video support" },
                { value: "Shared", label: "Coding session flow" },
                { value: "Fast", label: "Mentor dashboard access" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 backdrop-blur-xl"
                >
                  <p className="font-[var(--font-space-grotesk)] text-2xl font-semibold text-white">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
