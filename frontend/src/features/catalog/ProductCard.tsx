import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { formatPrice, monogram } from './format'
import type { ProductSummary } from './types'

export function ProductCard({ product }: { product: ProductSummary }) {
  const image = product.imageUrl
  const renderable = Boolean(image && (image.startsWith('http') || image.startsWith('/')))

  return (
    <Link
      to={`/producto/${product.slug}`}
      className="group block border border-white/10 transition-colors hover:border-white/40 focus-visible:border-white focus-visible:outline-none"
      style={{ '--g': product.game.accentColor } as CSSProperties}
    >
      <div className="card-img relative aspect-[4/5] overflow-hidden">
        {renderable && image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <>
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
                backgroundImage:
                  'repeating-linear-gradient(135deg, #ffffff 0 1px, transparent 1px 16px)',
              }}
            />
            <span
              aria-hidden
              className="display absolute inset-0 flex items-center justify-center text-7xl text-white/10 transition duration-700 group-hover:scale-110"
            >
              {monogram(product.team?.name, product.game.name)}
            </span>
            <span className="absolute inset-x-4 bottom-4 text-[10px] tracking-[0.2em] text-white/40 uppercase">
              Imagen en preparación
            </span>
          </>
        )}
        <span
          className="absolute top-4 left-4 text-[0.65rem] font-extrabold tracking-[0.2em] uppercase"
          style={{ color: product.game.accentColor }}
        >
          {product.game.name}
        </span>
        {product.featured ? (
          <span className="absolute top-4 right-4 border border-white/20 bg-black/60 px-2 py-1 text-[0.58rem] font-extrabold tracking-[0.18em] text-white/80 uppercase backdrop-blur">
            Destacado
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <p className="text-[0.65rem] font-bold tracking-[0.2em] text-white/45 uppercase">
          {product.category.name}
          {product.team ? ` · ${product.team.name}` : ''}
        </p>
        <h3 className="mt-1 text-sm leading-snug font-bold text-white group-hover:underline group-hover:underline-offset-4">
          {product.name}
        </h3>
        <div className="mt-4 flex items-end justify-between gap-3">
          <span className="display text-2xl">{formatPrice(product.price, product.currency)}</span>
          <span className="text-[0.62rem] font-extrabold tracking-[0.15em] text-white/50 uppercase transition-colors group-hover:text-white">
            Ver detalle <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
