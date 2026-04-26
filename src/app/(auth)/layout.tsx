import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex flex-col">
      {/* Header */}
      <header className="container py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-brand-700">
            Nigi<span className="text-gold-500">Triple</span>
          </span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="container py-5 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Nigittriple Industry. All rights reserved.
      </footer>
    </div>
  );
}
