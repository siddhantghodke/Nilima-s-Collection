import { Search } from 'lucide-react'

export default function Header({ search, onSearchChange }) {
  return (
    <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h1 className="font-serif text-2xl font-bold tracking-wide text-charcoal sm:text-3xl">
            NILIMA'S COLLECTION
          </h1>
          <p className="mt-1 text-sm tracking-widest text-charcoal/60 uppercase">
            Handcrafted Beadwork & Jewelry
          </p>
        </div>

        <div className="relative mx-auto max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-charcoal/40"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, category, or SKU…"
            aria-label="Search products"
            className="w-full rounded-full border border-charcoal/15 bg-white py-2.5 pr-4 pl-10 text-sm text-charcoal placeholder:text-charcoal/40 transition-shadow focus:border-teal focus:ring-2 focus:ring-teal/20 focus:outline-none"
          />
        </div>
      </div>
    </header>
  )
}
