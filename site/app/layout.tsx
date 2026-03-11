import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shravann — Open Source Multi-Agent Voice AI Platform",
  description:
    "Build and deploy multi-agent voice AI systems in minutes. Design agent pipelines with handoffs, connect to OpenAI Realtime or Google Gemini Live, and run real-time voice sessions powered by LiveKit.",
  openGraph: {
    title: "Shravann — Open Source Multi-Agent Voice AI Platform",
    description:
      "Design multi-agent voice pipelines, deploy real-time voice sessions. Powered by LiveKit, OpenAI Realtime, and Google Gemini Live.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#09090b] font-sans text-white antialiased">
        {children}
      </body>
    </html>
  );
}
