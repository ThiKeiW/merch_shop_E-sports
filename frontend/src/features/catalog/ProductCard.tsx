import type { ProductSummary } from './types'

function formatPrice(price: number, currency: string): string {
  return `${currency} $${price.toFixed(2)}`
}

function monogram(product: ProductSummary): string {
  const source = product.team?.name ?? product.game.name
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

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <article
      aria-label={product.name}
      className="group flex flex-col overflow-hidden border border-line bg-surface transition-colors hover:border-zinc-600"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(150deg, ${product.game.accentColor}38 0%, ${product.game.accentColor}0d 45%, transparent 72%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, #ffffff 0 1px, transparent 1px 16px)',
          }}
        />
        <span
          className="absolute top-4 left-4 text-[10px] font-semibold tracking-[0.22em] uppercase"
          style={{ color: product.game.accentColor }}
        >
          {product.game.name}
        </span>
        {product.featured ? (
          <span className="absolute top-4 right-4 border border-line bg-ink/70 px-2 py-1 text-[10px] tracking-[0.18em] text-zinc-300 uppercase">
            Destacado
          </span>
        ) : null}
        <span
          aria-hidden
          className="font-display absolute inset-0 flex items-center justify-center text-6xl text-white/[0.08] transition-transform duration-500 group-hover:scale-105 sm:text-7xl"
        >
          {monogram(product)}
        </span>
        <span className="absolute inset-x-4 bottom-4 text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
          Imagen en preparación
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 border-t border-line p-4">
        <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
          {product.category.name}
          {product.team ? ` · ${product.team.name}` : ''}
        </p>
        <h3 className="text-sm leading-snug font-semibold">{product.name}</h3>
        <p className="mt-auto pt-2">
          <span className="font-display text-lg">
            {formatPrice(product.price, product.currency)}
          </span>
        </p>
      </div>
    </article>
  )
}
