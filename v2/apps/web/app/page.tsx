export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy text-lg font-bold text-white">
              S
            </div>
            <span className="text-xl font-bold text-text-primary" style={{ fontFamily: "var(--font-heading)" }}>
              Search<span className="text-coral">Any</span>Cars
            </span>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <a
              href="#"
              className="rounded-full bg-navy/5 px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-navy/10"
            >
              Home
            </a>
            <a
              href="#"
              className="rounded-full px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-navy/5"
            >
              Search
            </a>
            <a
              href="#"
              className="rounded-full px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-navy/5"
            >
              S-Plus
            </a>
          </nav>
          <a
            href="#"
            className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-coral-light"
          >
            Find Cars
          </a>
        </div>
      </header>

      {/* Hero Section — Navy gradient, matching v1 design */}
      <section
        className="relative overflow-hidden py-24 text-center text-white md:py-32"
        style={{
          background: "linear-gradient(135deg, #0D1642 0%, #1A237E 50%, #283593 100%)",
        }}
      >
        <div className="mx-auto max-w-[1280px] px-4">
          <h1
            className="mb-4 text-4xl font-extrabold tracking-tight md:text-6xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Find Your Perfect{" "}
            <span className="text-coral">Used Car</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/80">
            India&apos;s trusted used car broker marketplace. Browse verified
            listings from top dealers across all major cities.
          </p>

          {/* Search widget placeholder */}
          <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl bg-white/10 p-6 backdrop-blur-sm sm:flex-row">
            <input
              type="text"
              placeholder="Search by brand, model, or city..."
              className="flex-1 rounded-full bg-white px-5 py-3 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-coral"
              readOnly
            />
            <button className="rounded-full bg-coral px-8 py-3 font-semibold text-white transition-colors hover:bg-coral-light">
              Search
            </button>
          </div>

          {/* Trust numbers */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/70">
            <div>
              <span className="block text-2xl font-bold text-white">1000+</span>
              Verified Cars
            </div>
            <div>
              <span className="block text-2xl font-bold text-white">50+</span>
              Cities
            </div>
            <div>
              <span className="block text-2xl font-bold text-white">100%</span>
              Inspected
            </div>
          </div>
        </div>
      </section>

      {/* Budget Brackets — Light background section */}
      <section className="bg-bg-light py-16">
        <div className="mx-auto max-w-[1280px] px-4">
          <h2
            className="mb-8 text-center text-3xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Shop by <span className="text-coral">Budget</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              "Under ₹2L",
              "₹2–3L",
              "₹3–5L",
              "₹5–8L",
              "₹8–10L",
              "₹10–15L",
              "₹15–20L",
              "Above ₹20L",
            ].map((bracket) => (
              <div
                key={bracket}
                className="cursor-pointer rounded-xl border border-border bg-white p-5 text-center font-semibold text-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {bracket}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="mx-auto max-w-[1280px] px-4 text-center">
          <h2
            className="mb-4 text-3xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Ready to find your dream car?
          </h2>
          <p className="mb-8 text-text-secondary">
            SearchAnyCars v2 is coming soon with a completely redesigned
            experience.
          </p>
          <button className="rounded-full bg-coral px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-coral-light">
            Get Started
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-dark py-10 text-center text-white/60">
        <div className="mx-auto max-w-[1280px] px-4">
          <p className="text-sm">
            &copy; 2024 SearchAnyCars.com — All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
