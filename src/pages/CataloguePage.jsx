import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import FilterBar from '../components/FilterBar'
import ProductGrid from '../components/ProductGrid'
import ProductModal from '../components/ProductModal'
import { fetchCategories, fetchProducts } from '../api/products'

export default function CataloguePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [inquiryList, setInquiryList] = useState([])

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([productData, categoryData]) => {
        setProducts(productData)
        setCategories(categoryData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [products, search, category])

  const handleAddToInquiry = (product) => {
    setInquiryList((prev) =>
      prev.some((item) => item.id === product.id) ? prev : [...prev, product],
    )
    setSelectedProduct(null)
  }

  return (
    <>
      <Header search={search} onSearchChange={setSearch} />

      <div className="mx-auto flex max-w-7xl justify-end px-4 pt-2 sm:px-6 lg:px-8">
        <Link
          to="/admin"
          className="text-xs text-charcoal/40 transition-colors hover:text-teal"
        >
          Admin
        </Link>
      </div>

      <FilterBar
        categories={categories}
        category={category}
        onCategoryChange={setCategory}
      />

      {loading && (
        <p className="py-16 text-center text-charcoal/50">Loading collection…</p>
      )}
      {error && (
        <p className="py-16 text-center text-red-600">
          Could not load products. Make sure the API server is running.
        </p>
      )}

      {!loading && !error && (
        <>
          {inquiryList.length > 0 && (
            <p className="mx-auto mb-2 max-w-7xl px-4 text-center text-xs text-teal sm:px-6 lg:px-8">
              {inquiryList.length} item{inquiryList.length !== 1 ? 's' : ''} in inquiry list
            </p>
          )}

          <ProductGrid products={filteredProducts} onViewDetails={setSelectedProduct} />
        </>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToInquiry={handleAddToInquiry}
        />
      )}
    </>
  )
}
