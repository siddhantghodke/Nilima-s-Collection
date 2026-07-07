/**
 * Express API server for NILIMA'S COLLECTION catalogue.
 */

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import db from './db.js'
import productsRouter from './routes/products.js'
import { UPLOADS_DIR, PUBLIC_URL_PREFIX, LEGACY_UPLOADS_DIR } from './utils/imageStorage.js'
import { seedDatabase } from './utils/seed.js'
import {
  createSession,
  requireAuth,
  revokeSession,
  verifyPassword,
} from './auth.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Serve processed WebP product images at /uploads/products/* (fallback for local files)
app.use(PUBLIC_URL_PREFIX, express.static(UPLOADS_DIR))

// Serve legacy product images at /uploads/*
app.use('/uploads', express.static(LEGACY_UPLOADS_DIR))

app.get('/', (req, res) => {
  res.send("Nilima's Collection API is running successfully!")
})

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body
  if (!verifyPassword(password)) {
    return res.status(401).json({ error: 'Incorrect password' })
  }
  res.json({ token: createSession() })
})

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  revokeSession(token)
  res.json({ success: true })
})

app.get('/api/auth/check', requireAuth, (_req, res) => {
  res.json({ authenticated: true })
})

// ── Categories ────────────────────────────────────────────────────────────────

app.get('/api/categories', async (_req, res) => {
  try {
    const { data: categories, error } = await db
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    res.json(categories || [])
  } catch (err) {
    console.error('Fetch categories failed:', err)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

app.post('/api/categories', requireAuth, async (req, res) => {
  const name = req.body.name?.trim()
  if (!name) return res.status(400).json({ error: 'Category name is required' })

  try {
    const { data: category, error } = await db
      .from('categories')
      .insert([{ name }])
      .select()
      .single()

    if (error) throw error
    res.status(201).json(category)
  } catch (err) {
    if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Category already exists' })
    }
    console.error('Create category failed:', err)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

app.put('/api/categories/:id', requireAuth, async (req, res) => {
  const { data: existing, error: existingError } = await db
    .from('categories')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()

  if (existingError || !existing) return res.status(404).json({ error: 'Category not found' })

  const name = req.body.name?.trim()
  if (!name) return res.status(400).json({ error: 'Category name is required' })

  try {
    // 1. Update category name
    const { error: updateCategoryError } = await db
      .from('categories')
      .update({ name })
      .eq('id', req.params.id)

    if (updateCategoryError) throw updateCategoryError

    // 2. Cascade rename product categories
    const { error: updateProductsError } = await db
      .from('products')
      .update({ category: name })
      .eq('category', existing.name)

    if (updateProductsError) throw updateProductsError

    const { data: category, error: fetchError } = await db
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (fetchError) throw fetchError
    res.json(category)
  } catch (err) {
    if (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Category already exists' })
    }
    console.error('Update category failed:', err)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

app.delete('/api/categories/:id', requireAuth, async (req, res) => {
  const { data: existing, error: existingError } = await db
    .from('categories')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle()

  if (existingError || !existing) return res.status(404).json({ error: 'Category not found' })

  try {
    // Check if category is used by products
    const { count, error: countError } = await db
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category', existing.name)

    if (countError) throw countError

    if (count && count > 0) {
      return res.status(409).json({ error: 'Cannot delete a category that has products' })
    }

    const { error: deleteError } = await db
      .from('categories')
      .delete()
      .eq('id', req.params.id)

    if (deleteError) throw deleteError

    res.json({ success: true })
  } catch (err) {
    console.error('Delete category failed:', err)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

// ── Products (multi-image CRUD) ───────────────────────────────────────────────

app.use('/api/products', productsRouter)

app.listen(PORT, async () => {
  console.log(`API running at http://localhost:${PORT}`)
  await seedDatabase()
})
