import { Filter } from 'lucide-react'

export default function FilterBar({ categories, category, onCategoryChange }) {
  const options = ['All', ...categories.map((c) => c.name)]

  return (
    <nav
      aria-label="Product categories"
      className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-2 px-4 py-6 sm:px-6 lg:px-8"
    >
      <Filter className="mr-1 hidden h-4 w-4 text-charcoal/40 sm:block" aria-hidden="true" />
      {options.map((cat) => {
        const active = category === cat
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryChange(cat)}
            aria-pressed={active}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-teal text-white shadow-sm'
                : 'bg-white text-charcoal/70 ring-1 ring-charcoal/10 hover:bg-teal/10 hover:text-teal'
            }`}
          >
            {cat}
          </button>
        )
      })}
    </nav>
  )
}
