import { getToken } from './auth'

const API = '/api'
const MAX_IMAGES = 4

async function request(url, options = {}, auth = false) {
  const isFormData = options.body instanceof FormData
  const headers = { ...options.headers }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API}${url}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

function buildProductFormData(fields, imageFiles = [], retainedImages = []) {
  const formData = new FormData()

  formData.append('name', fields.name)
  formData.append('category', fields.category)
  formData.append('price', String(fields.price))
  formData.append('description', fields.description)

  for (const file of imageFiles.slice(0, MAX_IMAGES)) {
    formData.append('images', file)
  }

  if (retainedImages.length > 0) {
    formData.append('retained_images', JSON.stringify(retainedImages))
  }

  return formData
}

export function fetchProducts() {
  return request('/products')
}

export function createProduct(fields, imageFiles = []) {
  return request(
    '/products',
    { method: 'POST', body: buildProductFormData(fields, imageFiles) },
    true,
  )
}

export function updateProduct(id, fields, imageFiles = [], retainedImages = []) {
  return request(
    `/products/${id}`,
    { method: 'PUT', body: buildProductFormData(fields, imageFiles, retainedImages) },
    true,
  )
}

export function deleteProduct(id) {
  return request(`/products/${id}`, { method: 'DELETE' }, true)
}

export function fetchCategories() {
  return request('/categories')
}

export function createCategory(name) {
  return request('/categories', { method: 'POST', body: JSON.stringify({ name }) }, true)
}

export function updateCategory(id, name) {
  return request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }, true)
}

export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: 'DELETE' }, true)
}
