export function formatPrice(amount) {
  return `₹${Math.round(Number(amount)).toLocaleString('en-IN')}`
}
