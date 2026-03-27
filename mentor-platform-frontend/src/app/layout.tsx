import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MentorSync",
  description: "A mentorship workspace for live calls, shared coding, and guided learning.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
