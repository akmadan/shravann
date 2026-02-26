import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shravann",
  description: "AI Agent Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#22c55e",
          colorBackground: "#111111",
          colorInputBackground: "#1a1a1a",
          colorInputText: "#ededed",
          colorText: "#ededed",
          colorTextSecondary: "#a3a3a3",
          colorDanger: "#ef4444",
          borderRadius: "0.5rem",
        },
        elements: {
          formButtonPrimary:
            "bg-[#22c55e] hover:bg-[#16a34a] text-black font-medium",
          socialButtonsBlockButton:
            "bg-[#1a1a1a] border-[#262626] hover:bg-[#262626] text-white",
          card: "bg-[#111111] border-[#262626]",
          headerTitle: "text-white",
          headerSubtitle: "text-[#a3a3a3]",
          formFieldLabel: "text-[#a3a3a3]",
          formFieldInput:
            "bg-[#1a1a1a] border-[#262626] text-white placeholder-[#525252]",
          footerActionLink: "text-[#22c55e] hover:text-[#16a34a]",
          identityPreview: "bg-[#1a1a1a] border-[#262626]",
          dividerLine: "bg-[#262626]",
          dividerText: "text-[#525252]",
        },
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
