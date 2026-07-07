import { Router } from 'express'
import { requireAuth } from '../auth.js'
import db from '../db.js'
import { handleUpload, uploadProductImages } from '../middleware/upload.js'
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  mergeImageUrls,
  updateProduct,
} from '../services/productService.js'
import { processAndSaveImages } from '../utils/imageStorage.js'

const router = Router()

function parseProductFields(body) {
  return {
    name: body.name?.trim(),
    category: body.category?.trim(),
    price: Math.round(Number(body.price)),
    description: body.description?.trim(),
  }
}

async function validateProductFields(fields) {
  if (
    !fields.name ||
    !fields.category ||
    Number.isNaN(fields.price) ||
    !fields.description
  ) {
    return 'All fields are required'
  }

  const { data: categoryExists, error } = await db
    .from('categories')
    .select('id')
    .eq('name', fields.category)
    .maybeSingle()

  if (error || !categoryExists) return 'Invalid category'

  return null
}

function parseRetainedImages(body) {
  if (!body.retained_images) return []

  try {
    const parsed = JSON.parse(body.retained_images)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return []
  }
}

/**
 * GET /api/products
 * Returns every product with an images[] array of public URL paths.
 */
router.get('/', async (_req, res) => {
  try {
    const products = await getAllProducts()
    res.json(products)
  } catch (err) {
    console.error('Fetch products failed:', err)
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

/**
 * GET /api/products/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    console.error('Fetch product by ID failed:', err)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

/**
 * POST /api/products
 * Accepts multipart/form-data:
 *   - Text fields: name, price, description, category
 *   - File field: images[] (2–4 images recommended, max 4)
 * SKU is generated automatically by the backend.
 */
router.post('/', requireAuth, handleUpload(uploadProductImages), async (req, res) => {
  const fields = parseProductFields(req.body)
  const validationError = await validateProductFields(fields)
  if (validationError) return res.status(400).json({ error: validationError })

  try {
    const imageUrls = await processAndSaveImages(req.files)
    const product = await createProduct(fields, imageUrls)
    res.status(201).json(product)
  } catch (err) {
    if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Could not generate a unique product code' })
    }
    console.error('Create product failed:', err)
    res.status(500).json({ error: 'Failed to create product' })
  }
})

/**
 * PUT /api/products/:id
 * Accepts multipart/form-data with the same editable fields as POST.
 * Pass retained_images as a JSON string array of URLs to keep; new files append.
 */
router.put('/:id', requireAuth, handleUpload(uploadProductImages), async (req, res) => {
  try {
    const existing = await getProductById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Product not found' })

    const fields = parseProductFields(req.body)
    const validationError = await validateProductFields(fields)
    if (validationError) return res.status(400).json({ error: validationError })

    const retained = parseRetainedImages(req.body)
    const newUrls = await processAndSaveImages(req.files)
    const imageUrls = mergeImageUrls(
      retained.length > 0 ? retained : existing.images,
      newUrls,
    )

    const product = await updateProduct(req.params.id, fields, imageUrls)
    res.json(product)
  } catch (err) {
    if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Could not save product due to a uniqueness conflict' })
    }
    console.error('Update product failed:', err)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

/**
 * DELETE /api/products/:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const removed = await deleteProduct(req.params.id)
    if (!removed) return res.status(404).json({ error: 'Product not found' })
    res.json({ success: true })
  } catch (err) {
    console.error('Delete product failed:', err)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

export default router
