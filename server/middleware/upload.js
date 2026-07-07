import multer from 'multer'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file
const MAX_FILES = 4

/**
 * Multer configured with memory storage so Sharp can process buffers
 * before anything is written to disk.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif|tiff)$/.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF)'))
    }
  },
})

/** Accept up to 4 product images under the "images" field name. */
export const uploadProductImages = upload.array('images', MAX_FILES)

/**
 * Wrap multer middleware to return JSON errors instead of HTML.
 */
export function handleUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' })
      }
      next()
    })
  }
}
