# THE ARTISAN COLLECTION — Architecture

A full-stack product catalogue for a premium handcrafted jewelry store. The frontend is a React + Tailwind SPA; the backend is a modular Node.js/Express API backed by SQLite with a Sharp image-processing pipeline.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  React SPA (Vite)                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ CataloguePage│  │  AdminPage   │  │  Components          │ │
│  │  /           │  │  /admin      │  │  Header, FilterBar,  │ │
│  │              │  │  (password)  │  │  ProductCard, Modal  │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘ │
│         │                 │                                     │
│         └────────┬────────┘                                     │
│                  │  /api/*  +  /uploads/*  (Vite dev proxy)    │
└──────────────────┼────────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Express API (port 3001)                                        │
│  ┌────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │ auth.js    │  │ routes/products │  │ utils/imageStorage  │ │
│  │ sessions   │  │ + categories    │  │ Sharp → WebP        │ │
│  └────────────┘  └────────┬────────┘  └──────────┬──────────┘ │
│                           │                       │             │
│                  ┌────────▼────────┐    ┌─────────▼──────────┐  │
│                  │ productService  │    │ public/uploads/    │  │
│                  │ (transactions)  │    │ products/*.webp    │  │
│                  └────────┬────────┘    └────────────────────┘  │
│                           ▼                                     │
│                  ┌─────────────────┐                            │
│                  │ SQLite (WAL)    │                            │
│                  │ products.db     │                            │
│                  └─────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend

### Stack

- **React 18** with Vite
- **Tailwind CSS** — cream/charcoal/teal palette, no external UI libraries
- **Lucide React** — icons
- **React Router** — `/` (catalogue) and `/admin` (management)

### Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `CataloguePage` | Public product grid with search, category filters, detail modal |
| `/admin` | `AdminPage` | Password-protected CRUD for products, categories, and images |

### Components

| Component | Responsibility |
|-----------|----------------|
| `Header` | Sticky brand title, subtitle, search input |
| `FilterBar` | Category filter buttons (driven by API data) |
| `ProductGrid` | Responsive grid (1 → 2 → 3–4 columns) |
| `ProductCard` | Primary image, SKU, price (₹), description, "View Details" |
| `ProductModal` | Image carousel (2–4 images), specs, "Add to Inquiry List" |
| `AdminLogin` | Password gate for `/admin` |

### UI Requirements

1. **Layout & Grid**
   - Sticky header: "THE ARTISAN COLLECTION" + "Handcrafted Beadwork & Jewelry"
   - Responsive product grid with card hover lift and shadow transitions

2. **Product Cards**
   - Primary image with fade-in (placeholder when none)
   - Product name (serif), SKU, price in Indian Rupees (₹)
   - Short materials-focused description
   - Badge when multiple images exist

3. **Interactive Features**
   - Real-time search by name, category, or SKU
   - Dynamic category filters from database
   - Animated detail modal with prev/next image carousel

4. **Technical Constraints**
   - Standard React hooks (`useState`, `useMemo`)
   - Raw Tailwind only — no Material UI, Shadcn, etc.
   - Accessible, semantic, fully responsive markup

### Frontend Data Shape

Products fetched from `GET /api/products` include:

```json
{
  "id": 1,
  "name": "Turquoise & Gold Beaded Necklace",
  "sku": "TN-001",
  "price": 125,
  "description": "Handwoven using premium Japanese glass beads…",
  "category": "Necklaces",
  "details": "A statement piece featuring…",
  "materials": "Japanese glass beads, 24k gold accents",
  "images": ["/uploads/products/1234-abc.webp", "/uploads/products/1235-def.webp"],
  "image_url": "/uploads/products/1234-abc.webp"
}
```

`images` is the canonical array for carousels. `image_url` is the primary image (first in array) for backward compatibility.

---

## Backend

### Stack

- **Node.js + Express** — REST API
- **better-sqlite3** — file-based SQLite (`server/products.db`)
- **Multer** — multipart file uploads (memory storage)
- **Sharp** — resize, WebP conversion, compression

### Project Structure

```
server/
├── index.js              # Express entry, auth, categories, static files
├── db.js                 # Schema, migrations, seed data
├── auth.js               # Token sessions + requireAuth middleware
├── routes/
│   └── products.js       # Product CRUD with multi-image uploads
├── services/
│   └── productService.js # DB transactions, images[] formatting
├── middleware/
│   └── upload.js         # Multer config (max 4 images, 10 MB each)
└── utils/
    └── imageStorage.js   # Sharp pipeline — swap for cloud storage later
```

### Database Schema

**`categories`**

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT UNIQUE | e.g. Necklaces, Bracelets |

**`products`**

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Product title |
| sku | TEXT UNIQUE | Stock-keeping unit |
| price | REAL | Stored as whole rupees |
| description | TEXT | Short card description |
| category | TEXT | Matches `categories.name` |
| details | TEXT | Long description for modal |
| materials | TEXT | Materials list |

**`product_images`** (1-to-many with products)

| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| product_id | INTEGER FK | `ON DELETE CASCADE` |
| image_url | TEXT | Public path, e.g. `/uploads/products/abc.webp` |
| is_primary | INTEGER | 1 for first/primary image |

### Image Processing Pipeline

1. Admin uploads 1–4 images via `images` multipart field
2. Multer holds files in memory (no raw disk write)
3. `imageStorage.js` processes each buffer with Sharp:
   - Resize to max **1200px** width (aspect ratio preserved)
   - Convert to **WebP** at **80%** quality
   - Save to `public/uploads/products/`
4. Public URLs stored in `product_images` table
5. Express serves files at `/uploads/products/*`

**Scalability:** To migrate to Firebase, Supabase, or S3, replace `processAndSaveImage` and `deleteImageFile` in `server/utils/imageStorage.js`. The routes and service layer stay unchanged.

### REST API

#### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | All products with `images[]` array |
| GET | `/api/products/:id` | Single product with `images[]` |
| GET | `/api/categories` | All categories |

#### Protected (Bearer token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | `{ password }` → `{ token }` |
| POST | `/api/auth/logout` | Revoke session |
| GET | `/api/auth/check` | Verify session |
| POST | `/api/products` | Create product + images (multipart) |
| PUT | `/api/products/:id` | Update product; `retained_images` JSON to keep URLs |
| DELETE | `/api/products/:id` | Delete product, images, and files |
| POST/PUT/DELETE | `/api/categories` | Category CRUD |

**Create/update product** — `multipart/form-data`:

| Field | Type | Required |
|-------|------|----------|
| name, sku, category, price, description, details, materials | text | Yes |
| images | file[] (max 4) | On create (optional on update) |
| retained_images | JSON string array | On update, to keep existing URLs |

---

## Development

| Script | Command | Description |
|--------|---------|-------------|
| `npm run dev` | concurrently | API (:3001) + Vite (:5173) |
| `npm run dev:server` | node server/index.js | API only |
| `npm run dev:client` | vite | Frontend only |
| `npm run build` | vite build | Production frontend → `dist/` |
| `npm start` | node server/index.js | Production API server |

Vite proxies `/api` and `/uploads` to the Express server during development.

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `ADMIN_PASSWORD` | `artisan` | Admin login password |
| `PORT` | `3001` | API server port |

### Ignored Files

- `server/products.db` — SQLite database
- `public/uploads/products/` — processed image files
