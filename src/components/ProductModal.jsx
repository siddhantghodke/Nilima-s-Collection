import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

export default function ProductModal({ product, onClose, onAddToInquiry }) {
  const closeRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)

  const images =
    product?.images?.length > 0
      ? product.images
      : product?.image_url
        ? [product.image_url]
        : []

  useEffect(() => {
    setActiveIndex(0)
    setIsExpanded(false)
  }, [product?.id])

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          setIsExpanded(false)
        } else {
          onClose()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isExpanded, onClose])

  if (!product) return null

  const hasMultiple = images.length > 1
  const currentImage = images[activeIndex]

  const goPrev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  const goNext = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-label="Close dialog"
      />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up overflow-hidden rounded-2xl bg-white shadow-2xl">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-20 rounded-full bg-white/90 p-1.5 text-charcoal/60 shadow-sm transition-colors hover:text-charcoal focus:ring-2 focus:ring-teal/30 focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto flex-1">
          <div className="relative aspect-[4/3] bg-gradient-to-b from-gray-50 to-white">
            {currentImage ? (
              <div
                className="group/img relative h-full w-full cursor-zoom-in overflow-hidden"
                onClick={() => setIsExpanded(true)}
              >
                <img
                  key={currentImage}
                  src={currentImage}
                  alt={`${product.name} — image ${activeIndex + 1}`}
                  className="h-full w-full animate-fade-in object-cover object-center transition-transform duration-500 group-hover/img:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-charcoal/20 opacity-0 transition-opacity duration-300 group-hover/img:opacity-100">
                  <span className="rounded-full bg-white/95 p-3 text-charcoal shadow-lg backdrop-blur-sm transition-transform duration-300 scale-90 group-hover/img:scale-100">
                    <ZoomIn className="h-5 w-5" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-teal/10">
                  <span className="font-serif text-5xl text-teal/60" aria-hidden="true">
                    ✦
                  </span>
                </div>
              </div>
            )}

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous image"
                  className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-charcoal/70 shadow transition-colors hover:text-charcoal"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Next image"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-charcoal/70 shadow transition-colors hover:text-charcoal"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      aria-label={`Show image ${index + 1}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index === activeIndex ? 'bg-teal' : 'bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <p className="text-xs tracking-wide text-charcoal/45 uppercase">SKU: {product.sku}</p>
            <h2 id="modal-title" className="mt-1 font-serif text-2xl font-bold text-charcoal">
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-teal">{product.category}</p>
            <p className="mt-4 text-3xl font-semibold text-teal">
              ₹{Math.round(product.price).toLocaleString('en-IN')}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-charcoal/70">{product.description}</p>
            <button
              type="button"
              onClick={() => onAddToInquiry(product)}
              className="mt-6 w-full rounded-lg bg-teal py-3 text-sm font-medium text-white transition-colors hover:bg-teal-dark focus:ring-2 focus:ring-teal/30 focus:outline-none"
            >
              Add to Inquiry List
            </button>
          </div>
        </div>
      </div>

      {isExpanded && currentImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/90 backdrop-blur-md cursor-zoom-out p-4 animate-fade-in"
          onClick={() => setIsExpanded(false)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 z-10 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            onClick={() => setIsExpanded(false)}
            aria-label="Close zoom view"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={currentImage}
            alt={product.name}
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl transition-transform duration-300 scale-95 md:scale-100"
          />
        </div>
      )}
    </div>
  )
}
