import db from '../db.js'

/**
 * Automatically seeds the Supabase database with default categories and products
 * if they are empty.
 */
export async function seedDatabase() {
  try {
    const { count: categoryCount, error: catError } = await db
      .from('categories')
      .select('*', { count: 'exact', head: true })

    if (catError) {
      if (catError.code === '42P01') { // Postgres relation does not exist
        console.log('ℹ️ Supabase database tables not found. Please run the SQL schema migration in Supabase Dashboard first.')
      } else {
        console.error('⚠️ Error checking categories table:', catError.message)
      }
      return
    }

    if (categoryCount === 0) {
      console.log('🌱 Seeding default categories into Supabase...')
      const { error } = await db.from('categories').insert([
        { name: 'Necklaces' },
        { name: 'Bracelets' },
        { name: 'Earrings' }
      ])
      if (error) throw error
    }

    const { count: productCount, error: prodError } = await db
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (prodError) throw prodError

    if (productCount === 0) {
      console.log('🌱 Seeding default products into Supabase...')
      const seedProducts = [
        {
          name: 'Turquoise & Gold Beaded Necklace',
          sku: 'SKU-0001',
          category: 'Necklaces',
          price: 125,
          description: 'Handwoven using premium Japanese glass beads and 24k gold accents.',
        },
        {
          name: 'Turquoise & Gold Bracelet',
          sku: 'SKU-0002',
          category: 'Bracelets',
          price: 85,
          description: 'Handwoven using premium Japanese glass beads and 24k gold accents.',
        },
        {
          name: 'Coral Dreams Earrings',
          sku: 'SKU-0003',
          category: 'Earrings',
          price: 45,
          description: 'Handwoven using premium Japanese glass beads and 24k gold accents.',
        },
        {
          name: 'Jade Harmony Bracelet',
          sku: 'SKU-0004',
          category: 'Bracelets',
          price: 72,
          description: 'Handwoven using premium Japanese glass beads and 24k gold accents.',
        },
      ]

      const { error } = await db.from('products').insert(seedProducts)
      if (error) throw error
      console.log('✅ Supabase seeding completed successfully!')
    }
  } catch (err) {
    console.error('❌ Auto-seeding database failed:', err.message)
  }
}
