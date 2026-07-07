import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ImagePlus, LogOut, Pencil, Plus, Trash2, X } from 'lucide-react'
import AdminLogin from '../components/AdminLogin'
import { checkAuth, clearToken, logout } from '../api/auth'
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  updateCategory,
  updateProduct,
} from '../api/products'
import { formatPrice } from '../utils/formatPrice'

const emptyForm = {
  name: '',
  category: '',
  price: '',
  description: '',
}

const MAX_IMAGES = 4

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [retainedImages, setRetainedImages] = useState([])

  const [newCategory, setNewCategory] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')

  useEffect(() => {
    checkAuth()
      .then(() => setAuthenticated(true))
      .catch(() => clearToken())
      .finally(() => setAuthChecking(false))
  }, [])

  const loadData = () => {
    setLoading(true)
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([productData, categoryData]) => {
        setProducts(productData)
        setCategories(categoryData)
        if (!form.category && categoryData.length > 0) {
          setForm((prev) => ({ ...prev, category: categoryData[0].name }))
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (authenticated) loadData()
  }, [authenticated])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const totalCount = retainedImages.length + imageFiles.length + files.length
    if (totalCount > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images per product`)
      return
    }

    setImageFiles((prev) => [...prev, ...files])
    setImagePreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))])
    e.target.value = ''
  }

  const removeRetainedImage = (url) => {
    setRetainedImages((prev) => prev.filter((img) => img !== url))
  }

  const removeNewImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed)
      return prev.filter((_, i) => i !== index)
    })
  }

  const startEdit = (product) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      category: product.category,
      price: String(Math.round(product.price)),
      description: product.description,
    })
    setImageFiles([])
    setImagePreviews([])
    setRetainedImages(product.images || (product.image_url ? [product.image_url] : []))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImageFiles([])
    setImagePreviews([])
    setRetainedImages([])
    setForm({
      ...emptyForm,
      category: categories[0]?.name || '',
    })
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const fields = {
        ...form,
        price: Math.round(Number(form.price)),
      }

      if (editingId) {
        await updateProduct(editingId, fields, imageFiles, retainedImages)
      } else {
        await createProduct(fields, imageFiles)
      }
      cancelEdit()
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return
    setError(null)
    try {
      await deleteProduct(id)
      if (editingId === id) cancelEdit()
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    setError(null)
    try {
      await createCategory(name)
      setNewCategory('')
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateCategory = async (id) => {
    const name = editingCategoryName.trim()
    if (!name) return
    setError(null)
    try {
      await updateCategory(id, name)
      setEditingCategoryId(null)
      setEditingCategoryName('')
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return
    setError(null)
    try {
      await deleteCategory(id)
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await logout()
    setAuthenticated(false)
  }

  if (authChecking) {
    return <p className="py-16 text-center text-gray-500">Checking access…</p>
  }

  if (!authenticated) {
    return <AdminLogin onSuccess={() => setAuthenticated(true)} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Product Admin</h1>
            <p className="text-sm text-gray-500">Manage products, categories & images</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-teal"
            >
              <ArrowLeft className="h-4 w-4" />
              View Site
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        {error && (
          <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {/* Categories */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-gray-900">Categories</h2>

          <form onSubmit={handleAddCategory} className="mb-4 flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>

          <ul className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-center justify-between py-3">
                {editingCategoryId === cat.id ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateCategory(cat.id)}
                      className="rounded-md bg-teal px-3 py-1.5 text-sm text-white hover:bg-teal-dark"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategoryId(null)}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-900">{cat.name}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(cat.id)
                          setEditingCategoryName(cat.name)
                        }}
                        className="rounded p-1.5 text-gray-500 hover:bg-teal/10 hover:text-teal"
                        aria-label={`Edit ${cat.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Product form */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-medium text-gray-900">
            {editingId ? (
              <>
                <Pencil className="h-4 w-4 text-teal" />
                Edit Product
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-teal" />
                Add Product
              </>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Price (₹)"
              name="price"
              type="number"
              step="1"
              min="0"
              value={form.price}
              onChange={handleChange}
              required
            />

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Product Images <span className="font-normal text-gray-400">(up to {MAX_IMAGES})</span>
              </label>
              <div className="flex flex-wrap items-start gap-3">
                {retainedImages.map((url) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt="Existing"
                      className="h-24 w-24 rounded-md border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeRetainedImage(url)}
                      className="absolute -top-2 -right-2 rounded-full bg-white p-0.5 shadow ring-1 ring-gray-200 hover:text-red-600"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {imagePreviews.map((preview, index) => (
                  <div key={preview} className="relative">
                    <img
                      src={preview}
                      alt="New upload"
                      className="h-24 w-24 rounded-md border border-teal/30 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute -top-2 -right-2 rounded-full bg-white p-0.5 shadow ring-1 ring-gray-200 hover:text-red-600"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {retainedImages.length + imageFiles.length < MAX_IMAGES && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 transition-colors hover:border-teal hover:text-teal">
                    <ImagePlus className="h-5 w-5" />
                    Add images
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
              />
            </div>

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-dark disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Update Product' : 'Add Product'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Product list */}
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <h2 className="border-b border-gray-200 px-6 py-4 text-base font-medium text-gray-900">
            All Products ({products.length})
          </h2>

          {loading ? (
            <p className="px-6 py-8 text-sm text-gray-500">Loading…</p>
          ) : products.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-500">No products yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 font-medium">Image</th>
                    <th className="px-6 py-3 font-medium">SKU</th>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Price</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        {(product.images?.[0] ?? product.image_url) ? (
                          <div className="relative">
                            <img
                              src={product.images?.[0] ?? product.image_url}
                              alt=""
                              className="h-10 w-10 rounded object-cover"
                            />
                            {product.images?.length > 1 && (
                              <span className="absolute -right-1 -bottom-1 rounded-full bg-teal px-1 text-[10px] text-white">
                                {product.images.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">{product.sku}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-3 text-gray-600">{product.category}</td>
                      <td className="px-6 py-3 text-gray-900">{formatPrice(product.price)}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(product)}
                            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-teal/10 hover:text-teal"
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
                            className="rounded p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text', ...rest }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
        {...rest}
      />
    </div>
  )
}
