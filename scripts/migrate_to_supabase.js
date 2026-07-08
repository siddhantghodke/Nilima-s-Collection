import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import sharp from 'sharp'
import db from '../server/db.js'

const IMAGES_DIR = path.resolve('Images')
const BUCKET_NAME = 'product-images'

async function main() {
  try {
    console.log('Starting seed process...')

    // Cleanup previous partial seed runs to make it clean and idempotent
    console.log('Cleaning up previous partial seed runs...')
    const { data: oldProducts, error: fetchOldError } = await db
      .from('products')
      .select('id')
      .eq('category', 'Artifacts')
      .like('name', 'Beads Pattern %')

    if (fetchOldError) {
      console.warn('Warning during old product fetch:', fetchOldError.message)
    }

    if (oldProducts && oldProducts.length > 0) {
      const oldIds = oldProducts.map(p => p.id)
      console.log(`Found ${oldIds.length} old seeded products. Deleting...`)

      // Delete from product_images
      const { error: delImagesErr } = await db
        .from('product_images')
        .delete()
        .in('product_id', oldIds)

      if (delImagesErr) {
        console.warn('Warning deleting old product images:', delImagesErr.message)
      }

      // Delete from products
      const { error: delProductsErr } = await db
        .from('products')
        .delete()
        .in('id', oldIds)

      if (delProductsErr) {
        console.warn('Warning deleting old products:', delProductsErr.message)
      }
      console.log('Cleanup completed.')
    } else {
      console.log('No previous partial seeds found to clean up.')
    }

    // Fetch current latest product ID to generate SKUs and product IDs sequentially
    const { data: latestProducts, error: skuError } = await db
      .from('products')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)

    if (skuError) {
      throw new Error(`Failed to fetch latest SKU sequence: ${skuError.message}`)
    }

    let nextProductId = (latestProducts?.[0]?.id ?? 0) + 1
    console.log(`Starting SKU/Product ID sequence counter at: ${nextProductId}`)

    // Fetch current latest product_images ID to generate product_images IDs sequentially
    const { data: latestProductImages, error: imageIdError } = await db
      .from('product_images')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)

    if (imageIdError) {
      throw new Error(`Failed to fetch latest product_images ID sequence: ${imageIdError.message}`)
    }

    let nextProductImageId = (latestProductImages?.[0]?.id ?? 0) + 1
    console.log(`Starting Product Images ID sequence counter at: ${nextProductImageId}`)

    // Read files in Images directory
    const files = await fs.promises.readdir(IMAGES_DIR)
    
    // Filter to only include image files and sort them alphabetically
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase()
        return imageExtensions.includes(ext) && !file.toLowerCase().includes('screenshot')
      })
      .sort()

    console.log(`Found ${imageFiles.length} image files to process.`)

    let successCount = 0
    let skipCount = 0

    for (let i = 0; i < imageFiles.length; i++) {
      const fileName = imageFiles[i]
      const filePath = path.join(IMAGES_DIR, fileName)
      const productName = `Beads Pattern ${i + 1}`

      console.log(`[${i + 1}/${imageFiles.length}] Processing ${fileName} as "${productName}"...`)

      try {
        // Read file into buffer
        const buffer = await fs.promises.readFile(filePath)

        // Process with sharp (rotate, resize, convert to webp)
        const processedBuffer = await sharp(buffer)
          .rotate() // respect EXIF orientation
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer()

        // Generate a unique remote filename
        const uniqueId = crypto.randomBytes(4).toString('hex')
        const remoteFileName = `seed-${Date.now()}-${uniqueId}.webp`

        // Upload to Supabase Storage
        const { error: uploadError } = await db.storage
          .from(BUCKET_NAME)
          .upload(remoteFileName, processedBuffer, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Failed to upload to storage: ${uploadError.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = db.storage
          .from(BUCKET_NAME)
          .getPublicUrl(remoteFileName)

        if (!publicUrl) {
          throw new Error('Failed to retrieve public URL')
        }

        // Generate SKU in-memory
        const sku = `SKU-${String(nextProductId).padStart(4, '0')}`

        // Insert product into Supabase products table
        const { data: product, error: productError } = await db
          .from('products')
          .insert([
            {
              id: nextProductId,
              name: productName,
              sku: sku,
              category: 'Artifacts',
              price: 299,
              description: 'Colourful beads artifacts'
            }
          ])
          .select()
          .single()

        if (productError) {
          throw new Error(`Failed to insert product: ${productError.message}`)
        }

        // Insert product image relationship with explicit ID
        const { error: imageError } = await db
          .from('product_images')
          .insert([
            {
              id: nextProductImageId,
              product_id: product.id,
              image_url: publicUrl,
              is_primary: 1
            }
          ])

        if (imageError) {
          // If inserting the image relation fails, delete the product to maintain consistency
          await db.from('products').delete().eq('id', product.id)
          throw new Error(`Failed to insert product image relation: ${imageError.message}`)
        }

        console.log(`Successfully seeded: "${productName}" (SKU: ${sku}, ID: ${product.id}, Image ID: ${nextProductImageId}, Image URL: ${publicUrl})`)
        
        // Increment IDs after complete success
        nextProductId++
        nextProductImageId++
        successCount++
      } catch (err) {
        console.error(`Error processing ${fileName}:`, err.message)
        skipCount++
      }
    }

    console.log(`Seeding complete. Success: ${successCount}, Failed: ${skipCount}`)
  } catch (err) {
    console.error('Fatal error during seeding:', err)
  }
}

main()
