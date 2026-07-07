import db from '../db.js'
import { deleteImageFiles } from '../utils/imageStorage.js'

/**
 * Get all products with sorted images array.
 */
export async function getAllProducts() {
  const { data: products, error } = await db
    .from('products')
    .select('*, product_images(image_url, is_primary)')
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching all products:', error)
    return []
  }

  return (products || []).map((product) => {
    const images = (product.product_images || [])
      .sort((a, b) => b.is_primary - a.is_primary)
      .map((img) => img.image_url)

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      description: product.description,
      category: product.category,
      images,
      image_url: images[0] ?? null,
    }
  })
}

/**
 * Get a single product by ID.
 */
export async function getProductById(id) {
  const { data: product, error } = await db
    .from('products')
    .select('*, product_images(image_url, is_primary)')
    .eq('id', id)
    .maybeSingle()

  if (error || !product) {
    if (error) console.error('Error fetching product by ID:', error)
    return null
  }

  const images = (product.product_images || [])
    .sort((a, b) => b.is_primary - a.is_primary)
    .map((img) => img.image_url)

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    price: product.price,
    description: product.description,
    category: product.category,
    images,
    image_url: images[0] ?? null,
  }
}

function buildSkuFromNumber(number) {
  return `SKU-${String(number).padStart(4, '0')}`
}

async function getNextProductSku() {
  const { data, error } = await db
    .from('products')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching next SKU sequence:', error)
  }

  const nextId = (data?.[0]?.id ?? 0) + 1
  return buildSkuFromNumber(nextId)
}

/**
 * Create a product and its related images in Supabase.
 */
export async function createProduct(fields, imageUrls = []) {
  const sku = await getNextProductSku()

  const { data: product, error: productError } = await db
    .from('products')
    .insert([{ ...fields, sku }])
    .select()
    .single()

  if (productError) {
    throw productError
  }

  const productId = product.id

  if (imageUrls.length > 0) {
    const imagesToInsert = imageUrls.map((url, index) => ({
      product_id: productId,
      image_url: url,
      is_primary: index === 0 ? 1 : 0,
    }))

    const { error: imagesError } = await db
      .from('product_images')
      .insert(imagesToInsert)

    if (imagesError) {
      console.error('Failed to insert images for product:', imagesError)
    }
  }

  return getProductById(productId)
}

/**
 * Update product fields and optionally replace the image set.
 */
export async function updateProduct(id, fields, imageUrls) {
  const existing = await getProductById(id)
  if (!existing) return null

  const { error: updateError } = await db
    .from('products')
    .update(fields)
    .eq('id', id)

  if (updateError) {
    throw updateError
  }

  if (imageUrls !== undefined) {
    const { error: deleteImagesError } = await db
      .from('product_images')
      .delete()
      .eq('product_id', id)

    if (deleteImagesError) {
      throw deleteImagesError
    }

    if (imageUrls.length > 0) {
      const imagesToInsert = imageUrls.map((url, index) => ({
        product_id: id,
        image_url: url,
        is_primary: index === 0 ? 1 : 0,
      }))

      const { error: insertImagesError } = await db
        .from('product_images')
        .insert(imagesToInsert)

      if (insertImagesError) {
        throw insertImagesError
      }
    }

    const oldImages = existing.images
    const removed = oldImages.filter((url) => !imageUrls.includes(url))
    await deleteImageFiles(removed)
  }

  return getProductById(id)
}

/**
 * Delete a product and its associated files in cloud storage.
 */
export async function deleteProduct(id) {
  const existing = await getProductById(id)
  if (!existing) return false

  const { error } = await db
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }

  await deleteImageFiles(existing.images)
  return true
}

/**
 * Merge retained image URLs with newly processed uploads.
 */
export function mergeImageUrls(retainedUrls = [], newUrls = []) {
  const seen = new Set()
  const merged = []

  for (const url of [...retainedUrls, ...newUrls]) {
    if (url && !seen.has(url)) {
      seen.add(url)
      merged.push(url)
    }
  }

  return merged.slice(0, 4)
}
