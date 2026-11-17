export function formatPrice(price: number, currency: string): string {
  return `${currency} $${price.toFixed(2)}`
}

export function monogram(...names: (string | null | undefined)[]): string {
  const source = names.find((name) => Boolean(name)) ?? ''
  if (!source.includes(' ') && source.length <= 3) {
    return source.toUpperCase()
  }
  return source
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}
