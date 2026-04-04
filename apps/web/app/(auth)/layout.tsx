export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full items-center justify-center bg-[#0a0a0a] lg:w-1/2">
        {children}
      </div>

      <div className="hidden w-1/2 flex-col items-center justify-center bg-[#111111] p-16 lg:flex">
        <div className="max-w-md space-y-8">
          <div className="text-5xl text-[#3b82f6]">&ldquo;</div>

          <blockquote className="text-2xl font-medium leading-relaxed text-white">
            Build and deploy voice AI agents in minutes. Shravann handles the
            infrastructure so you can focus on the experience.
          </blockquote>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3b82f6]/20 text-lg font-bold text-[#3b82f6]">
              S
            </div>
            <div>
              <p className="font-semibold text-white">Shravann</p>
              <p className="text-sm text-[#a3a3a3]">AI Agent Platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
