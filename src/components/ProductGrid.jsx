import ProductCard from './ProductCard'

export default function ProductGrid({ products, onViewDetails }) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-charcoal/50">No products match your search.</p>
    )
  }

  return (
    <section
      aria-label="Product catalogue"
      className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 xl:grid-cols-4 lg:px-8"
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onViewDetails={onViewDetails} />
      ))}
    </section>
  )
}
