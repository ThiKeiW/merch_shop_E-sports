import { Link } from 'react-router-dom'

import { formatPrice, monogram } from './format'
import type { ProductSummary } from './types'

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group flex flex-col overflow-hidden border border-line bg-surface transition-colors hover:border-zinc-600 focus-visible:border-zinc-400 focus-visible:outline-none"
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
          {monogram(product.team?.name, product.game.name)}
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
        <h3 className="text-sm leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </h3>
        <p className="mt-auto flex items-end justify-between gap-3 pt-2">
          <span className="font-display text-lg">
            {formatPrice(product.price, product.currency)}
          </span>
          <span className="text-[10px] font-semibold tracking-[0.18em] text-zinc-500 uppercase transition-colors group-hover:text-zinc-300">
            Ver detalle
            <span aria-hidden> →</span>
          </span>
        </p>
      </div>
    </Link>
  )
}
