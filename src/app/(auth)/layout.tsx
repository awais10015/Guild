import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            { }
            <img src="/logo.svg" alt="Guild" className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">Guild</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center bg-muted/30 px-4 py-12">
        {children}
      </main>
    </div>
  );
}
