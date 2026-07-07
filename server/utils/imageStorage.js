import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import db from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/products')
export const LEGACY_UPLOADS_DIR = path.join(__dirname, '../uploads')
export const PUBLIC_URL_PREFIX = '/uploads/products'

const MAX_WIDTH = 1200
const WEBP_QUALITY = 80

/**
 * Resize, convert to WebP, compress, and upload a single image to Supabase Storage.
 *
 * @param {Buffer} buffer - Raw image bytes from multer memory storage
 * @returns {Promise<string>} Public URL path
 */
export async function processAndSaveImage(buffer) {
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`

  const processedBuffer = await sharp(buffer)
    .rotate() // respect EXIF orientation
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  const { error } = await db.storage
    .from('product-images')
    .upload(filename, processedBuffer, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Failed to upload image to Supabase: ${error.message}`)
  }

  const { data: { publicUrl } } = db.storage
    .from('product-images')
    .getPublicUrl(filename)

  return publicUrl
}

/**
 * Process and save multiple uploaded files in order.
 *
 * @param {Express.Multer.File[]} files
 * @returns {Promise<string[]>} Array of public URL paths
 */
export async function processAndSaveImages(files = []) {
  const urls = []
  for (const file of files) {
    if (file?.buffer?.length) {
      urls.push(await processAndSaveImage(file.buffer))
    }
  }
  return urls
}

/**
 * Delete a single image from Supabase Storage.
 *
 * @param {string|null|undefined} imageUrl - Public URL returned by processAndSaveImage
 */
export async function deleteImageFile(imageUrl) {
  if (!imageUrl) return

  // Extract the filename from the Supabase public URL
  // Format: https://xxx.supabase.co/storage/v1/object/public/product-images/filename.webp
  const parts = imageUrl.split('/')
  const filename = parts[parts.length - 1]
  if (!filename) return

  const { error } = await db.storage.from('product-images').remove([filename])
  if (error) {
    console.error(`Failed to delete image ${filename} from Supabase:`, error.message)
  }
}

/**
 * Delete multiple images from Supabase Storage.
 *
 * @param {string[]} imageUrls
 */
export async function deleteImageFiles(imageUrls = []) {
  for (const url of imageUrls) {
    await deleteImageFile(url)
  }
}
