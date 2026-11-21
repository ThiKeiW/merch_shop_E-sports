import { useQuery } from '@tanstack/react-query'
import { useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'

import { useCartStore } from '@/features/cart'
import { ApiError } from '@/shared/api'

import { fetchProduct } from './api'
import { formatPrice, monogram } from './format'
import type { ProductDetail } from './types'

function ProductVisual({ product }: { product: ProductDetail }) {
  const image = product.images[0]
  const renderable = Boolean(image && (image.path.startsWith('http') || image.path.startsWith('/')))

  return (
    <div
      className="card-img relative aspect-square overflow-hidden"
      style={{ '--g': product.game.accentColor } as CSSProperties}
    >
      {renderable && image ? (
        <img src={image.path} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(150deg, ${product.game.accentColor}45 0%, ${product.game.accentColor}12 45%, transparent 75%)`,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, #ffffff 0 1px, transparent 1px 18px)',
            }}
          />
          <span
            aria-hidden
            className="display absolute inset-0 flex items-center justify-center text-[7rem] leading-none text-white/10"
          >
            {monogram(product.team?.name, product.game.name)}
          </span>
          <span className="absolute inset-x-6 bottom-6 text-[10px] tracking-[0.22em] text-white/40 uppercase">
            Imagen en preparación
          </span>
        </>
      )}
      <span
        className="absolute top-5 left-5 text-[0.7rem] font-extrabold tracking-[0.22em] uppercase"
        style={{ color: product.game.accentColor }}
      >
        {product.game.name}
      </span>
      {product.featured ? (
        <span className="absolute top-5 right-5 border border-white/20 bg-black/60 px-2 py-1 text-[0.6rem] font-extrabold tracking-[0.18em] text-white/80 uppercase backdrop-blur">
          Destacado
        </span>
      ) : null}
    </div>
  )
}

function ProductDetailView({ product }: { product: ProductDetail }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [addedVariantId, setAddedVariantId] = useState<number | null>(null)
  const addToCart = useCartStore((state) => state.add)
  const selected =
    product.variants.find((variant) => variant.id === selectedId) ??
    product.variants.find((variant) => variant.available) ??
    product.variants[0]

  const price = selected ? selected.finalPrice : product.price

  return (
    <section
      className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-28 md:px-8"
      style={{ '--g': product.game.accentColor } as CSSProperties}
    >
      <nav aria-label="Ruta de navegación" className="text-[0.7rem] tracking-[0.2em] uppercase">
        <ol className="flex flex-wrap items-center gap-2 text-white/45">
          <li>
            <Link to="/catalogo" className="transition-colors hover:text-white">
              Catálogo
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              to={`/catalogo?game=${product.game.slug}`}
              className="transition-colors hover:text-white"
            >
              {product.game.name}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-white/80">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="md:sticky md:top-24 md:self-start">
          <ProductVisual product={product} />
        </div>

        <div className="flex flex-col">
          <p className="text-[0.7rem] font-bold tracking-[0.2em] text-white/45 uppercase">
            {product.category.name}
            {product.team ? ` · ${product.team.name}` : ''}
          </p>
          <h1 className="display mt-2 text-4xl leading-[0.95] md:text-6xl">{product.name}</h1>

          <p className="mt-4 max-w-prose text-sm leading-relaxed text-white/65">
            {product.description ??
              'Producto oficial de demostración. Las imágenes y el inventario definitivo llegan en la siguiente fase.'}
          </p>

          <p className="sr-only" aria-live="polite">
            Precio {formatPrice(price, product.currency)}
            {selected ? `, variante ${selected.size}` : ''}
          </p>
          <p className="display mt-8 text-5xl">{formatPrice(price, product.currency)}</p>
          <p className="mt-1 text-[0.7rem] tracking-[0.15em] text-white/45 uppercase">
            {product.currency} · impuestos no incluidos
          </p>

          {product.variants.length > 0 ? (
            <fieldset className="mt-8">
              <legend className="mb-3 text-[0.7rem] font-extrabold tracking-[0.2em] text-white/50 uppercase">
                Variante
              </legend>
              <div className="flex flex-wrap gap-3">
                {product.variants.map((variant) => {
                  const pressed = selected?.id === variant.id
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      aria-pressed={pressed}
                      aria-label={`${variant.size} ${variant.color}`}
                      disabled={!variant.available}
                      onClick={() => setSelectedId(variant.id)}
                      title={variant.available ? undefined : 'Agotado'}
                      className="bevel min-w-20 flex-col items-start"
                    >
                      <span className="text-xs font-extrabold tracking-[0.08em] uppercase">
                        {variant.size}
                      </span>
                      <span className="text-[0.6rem] tracking-[0.12em] uppercase opacity-70">
                        {variant.color}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          <p className="mt-5 text-sm text-white/55">
            {selected ? (
              selected.available ? (
                <>
                  En stock · <b className="text-white">{selected.stock}</b>{' '}
                  {selected.stock === 1 ? 'unidad' : 'unidades'}
                </>
              ) : (
                <span className="text-amber-300">Agotado por ahora</span>
              )
            ) : (
              'Sin variantes registradas'
            )}
          </p>

          <button
            type="button"
            disabled={!selected?.available}
            onClick={() => {
              if (!selected || !selected.available) {
                return
              }
              addToCart({
                variantId: selected.id,
                productId: product.id,
                slug: product.slug,
                name: product.name,
                sku: selected.sku,
                size: selected.size,
                color: selected.color,
                unitPrice: selected.finalPrice,
                currency: product.currency,
                imagePath: product.images[0]?.path ?? null,
                stock: selected.stock,
              })
              setAddedVariantId(selected.id)
            }}
            className="bevel bevel-p mt-8 w-full py-4"
          >
            <svg aria-hidden className="ic h-4 w-4" viewBox="0 0 24 24">
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
              <path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6" />
            </svg>
            Añadir al carrito
          </button>
          {addedVariantId === selected?.id ? (
            <p role="status" className="mt-3 text-xs text-emerald-300">
              Añadido.{' '}
              <Link to="/carrito" className="underline underline-offset-4">
                Ver carrito
              </Link>
            </p>
          ) : (
            <p className="mt-3 text-[0.7rem] text-white/40">
              El stock se valida de nuevo al confirmar el pedido.
            </p>
          )}

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/10 pt-8 text-sm">
            <div>
              <dt className="text-[0.65rem] font-bold tracking-[0.2em] text-white/40 uppercase">SKU</dt>
              <dd className="mt-1 text-white/85">{selected?.sku ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-bold tracking-[0.2em] text-white/40 uppercase">
                Categoría
              </dt>
              <dd className="mt-1 text-white/85">{product.category.name}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-bold tracking-[0.2em] text-white/40 uppercase">
                Equipo
              </dt>
              <dd className="mt-1 text-white/85">{product.team?.name ?? 'Sin equipo'}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-bold tracking-[0.2em] text-white/40 uppercase">
                Juego
              </dt>
              <dd className="mt-1 text-white/85">{product.game.name}</dd>
            </div>
          </dl>

          <Link
            to={`/catalogo?game=${product.game.slug}`}
            className="mt-8 inline-flex items-center gap-2 text-[0.7rem] font-extrabold tracking-[0.16em] text-white/65 uppercase underline underline-offset-4 transition-colors hover:text-white"
          >
            <span aria-hidden>←</span>
            Seguir explorando {product.game.name}
          </Link>
        </div>
      </div>
    </section>
  )
}

function DetailSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-28 md:px-8">
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="card-img aspect-square animate-pulse" />
        <div className="flex flex-col gap-4">
          <div className="h-3 w-32 animate-pulse bg-surface-2" />
          <div className="h-12 w-3/4 animate-pulse bg-surface-2" />
          <div className="h-20 w-full animate-pulse bg-surface-2" />
          <div className="h-10 w-40 animate-pulse bg-surface-2" />
        </div>
      </div>
    </section>
  )
}

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const productQuery = useQuery({
    queryKey: ['catalog', 'product', slug],
    queryFn: () => fetchProduct(slug),
    enabled: slug.length > 0,
  })

  if (productQuery.isPending) {
    return <DetailSkeleton />
  }

  if (productQuery.isError) {
    const notFound = productQuery.error instanceof ApiError && productQuery.error.status === 404
    return (
      <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-4 pt-28 pb-20 text-center">
        <p className="eyebrow">{notFound ? '404' : 'Error'}</p>
        <h1 className="display mt-4 text-3xl">
          {notFound ? 'Producto no encontrado' : 'No pudimos cargar el producto'}
        </h1>
        <p className="mt-4 max-w-xl text-sm text-white/55">
          {notFound
            ? 'Puede que se haya retirado del catálogo o que el enlace esté mal escrito.'
            : productQuery.error.message}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {notFound ? null : (
            <button type="button" onClick={() => productQuery.refetch()} className="bevel">
              Reintentar
            </button>
          )}
          <Link to="/catalogo" className="bevel">
            Volver al catálogo
          </Link>
        </div>
      </section>
    )
  }

  return <ProductDetailView product={productQuery.data} />
}
