export default function ProductCard({ product, onViewDetails }) {
  const primaryImage = product.images?.[0] ?? product.image_url

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-charcoal/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-gray-50 to-white">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full animate-fade-in object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex animate-fade-in items-center justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal/10">
              <span className="font-serif text-2xl text-teal/60" aria-hidden="true">
                ✦
              </span>
            </div>
          </div>
        )}
        {product.images?.length > 1 && (
          <span className="absolute right-2 bottom-2 rounded-full bg-charcoal/60 px-2 py-0.5 text-xs text-white">
            +{product.images.length - 1}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-serif text-lg font-semibold text-charcoal">{product.name}</h2>
        <p className="mt-1 text-xs tracking-wide text-charcoal/45 uppercase">
          SKU: {product.sku}
        </p>
        <p className="mt-3 text-xl font-semibold text-teal">
          ₹{Math.round(product.price).toLocaleString('en-IN')}
        </p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-charcoal/60">
          {product.description}
        </p>
        <button
          type="button"
          onClick={() => onViewDetails(product)}
          className="mt-4 w-full rounded-lg border border-teal/30 py-2.5 text-sm font-medium text-teal transition-colors duration-200 hover:bg-teal hover:text-white focus:ring-2 focus:ring-teal/30 focus:outline-none"
        >
          View Details
        </button>
      </div>
    </article>
  )
}
