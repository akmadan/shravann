import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Session | Shravann",
  description: "Start a conversation with an AI agent",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
