# NILIMA'S COLLECTION

A premium product catalogue for handcrafted beadwork jewelry, built with React, Tailwind CSS, and a Node.js/Express API backed by Supabase.

**Live features:** searchable product grid, category filters, multi-image detail modal, password-protected admin panel with full product/category CRUD, and automatic WebP image processing.

---

## Quick Start

```bash
npm install
npm run dev
```

| URL | Description |
|-----|-------------|
| http://localhost:5173 | Public catalogue |
| http://localhost:5173/admin | Admin panel (uses password set in env) |

To change the admin password, set the `ADMIN_PASSWORD` environment variable in your `.env` file before starting the server.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Lucide React |
| Backend | Node.js, Express |
| Database | PostgreSQL via Supabase |
| Images | Supabase Storage (processed via Multer + Sharp) |
| Auth | Token-based admin sessions |

---

## Project Structure

```
├── src/
│   ├── pages/
│   │   ├── CataloguePage.jsx    # Public product grid
│   │   └── AdminPage.jsx        # Product & category management
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── FilterBar.jsx
│   │   ├── ProductGrid.jsx
│   │   ├── ProductCard.jsx
│   │   ├── ProductModal.jsx     # Image carousel (mobile-optimized)
│   │   └── AdminLogin.jsx
│   ├── api/
│   │   ├── products.js          # API client (FormData for uploads)
│   │   └── auth.js
│   └── utils/
│       └── formatPrice.js       # ₹ formatting
├── server/
│   ├── index.js                 # Express entry point
│   ├── db.js                    # Supabase database initialization
│   ├── auth.js
│   ├── routes/products.js
│   ├── services/productService.js
│   ├── middleware/upload.js
│   └── utils/imageStorage.js    # Sharp pipeline + Supabase Storage upload
├── .env.example                 # Environment variables template
└── architecture.md              # Full system design reference
```

---

## API Overview

### Products

```http
GET  /api/products          # List all (each includes images[])
GET  /api/products/:id      # Single product
POST /api/products          # Create (auth + multipart)
PUT  /api/products/:id      # Update (auth + multipart)
DELETE /api/products/:id    # Delete (auth)
```

**Product response shape:**

```json
{
  "id": 1,
  "name": "Turquoise & Gold Beaded Necklace",
  "sku": "SKU-0001",
  "price": 125,
  "description": "Handwoven using premium Japanese glass beads…",
  "category": "Necklaces",
  "images": ["https://xxx.supabase.co/.../abc.webp", "https://xxx.supabase.co/.../def.webp"],
  "image_url": "https://xxx.supabase.co/.../abc.webp"
}
```

### Categories

```http
GET    /api/categories
POST   /api/categories      # auth
PUT    /api/categories/:id  # auth
DELETE /api/categories/:id  # auth
```

### Auth

```http
POST /api/auth/login   # { "password": "<env_password>" } → { "token": "…" }
GET  /api/auth/check   # Authorization: Bearer <token>
POST /api/auth/logout  # Authorization: Bearer <token>
```

---

## Admin Usage

1. Go to `/admin` and log in (using password set in `.env`)
2. **Categories** — add, rename, or delete categories (cannot delete if products exist)
3. **Products** — fill in name, SKU, category, price (₹), descriptions, and upload up to **4 images**
4. Images are automatically resized to 1200px max width, converted to WebP, and uploaded to your Supabase `product-images` storage bucket
5. When editing, remove individual images or add new ones; retained images are preserved via `retained_images`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + frontend together |
| `npm run dev:server` | API only (port 3001) |
| `npm run dev:client` | Vite dev server only (port 5173) |
| `npm run build` | Build frontend to `dist/` |
| `npm start` | Run API server (production) |

---

## Production Notes

- Build the frontend with `npm run build`, then serve `dist/` via your preferred static host (like Vercel)
- Set `ADMIN_PASSWORD` to a strong, secure value in your Render environment variables
- Database tables and storage buckets are configured on Supabase
- To run SQL migrations or manage storage, visit your Supabase dashboard

---

## Further Reading

See [architecture.md](./architecture.md) for the full system design, database schema, image pipeline details, and scalability notes.
