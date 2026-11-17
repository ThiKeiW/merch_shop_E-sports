import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ApiError } from '@/shared/api'

import { fetchProduct } from './api'
import { formatPrice, monogram } from './format'
import type { ProductDetail } from './types'

function ProductVisual({ product }: { product: ProductDetail }) {
  const image = product.images[0]
  const renderable = Boolean(image && (image.path.startsWith('http') || image.path.startsWith('/')))

  return (
    <div className="relative aspect-square overflow-hidden border border-line bg-surface-2">
      {renderable && image ? (
        <img
          src={image.path}
          alt={product.name}
          className="h-full w-full object-cover"
        />
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
            className="font-display absolute inset-0 flex items-center justify-center text-[7rem] leading-none text-white/[0.08]"
          >
            {monogram(product.team?.name, product.game.name)}
          </span>
          <span className="absolute inset-x-6 bottom-6 text-[10px] tracking-[0.22em] text-zinc-500 uppercase">
            Imagen en preparación
          </span>
        </>
      )}
      <span
        className="absolute top-5 left-5 text-[11px] font-semibold tracking-[0.22em] uppercase"
        style={{ color: product.game.accentColor }}
      >
        {product.game.name}
      </span>
      {product.featured ? (
        <span className="absolute top-5 right-5 border border-line bg-ink/70 px-2 py-1 text-[10px] tracking-[0.18em] text-zinc-300 uppercase">
          Destacado
        </span>
      ) : null}
    </div>
  )
}

function ProductDetailView({ product }: { product: ProductDetail }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected =
    product.variants.find((variant) => variant.id === selectedId) ??
    product.variants.find((variant) => variant.available) ??
    product.variants[0]

  const price = selected ? selected.finalPrice : product.price

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <nav aria-label="Ruta de navegación" className="text-[11px] tracking-[0.18em] uppercase">
        <ol className="flex flex-wrap items-center gap-2 text-zinc-500">
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
          <li aria-current="page" className="text-zinc-300">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductVisual product={product} />
        </div>

        <div className="flex flex-col">
          <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
            {product.category.name}
            {product.team ? ` · ${product.team.name}` : ''}
          </p>
          <h1 className="font-display mt-3 text-3xl leading-[0.95] tracking-tight uppercase sm:text-5xl">
            {product.name}
          </h1>

          <p className="mt-5 max-w-prose text-sm leading-relaxed text-zinc-400">
            {product.description ??
              'Producto oficial de demostración. Las imágenes y el inventario definitivo llegan en la siguiente fase.'}
          </p>

          <p className="sr-only" aria-live="polite">
            Precio {formatPrice(price, product.currency)}
            {selected ? `, variante ${selected.size}` : ''}
          </p>
          <p className="font-display mt-8 text-4xl">{formatPrice(price, product.currency)}</p>
          <p className="mt-1 text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
            {product.currency} · impuestos no incluidos
          </p>

          {product.variants.length > 0 ? (
            <fieldset className="mt-8">
              <legend className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-zinc-400 uppercase">
                Variante
              </legend>
              <div className="flex flex-wrap gap-2">
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
                      className={
                        pressed
                          ? 'flex min-w-20 flex-col items-start border border-white bg-white px-3 py-2 text-left text-ink'
                          : 'flex min-w-20 flex-col items-start border border-line px-3 py-2 text-left text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600 disabled:hover:border-line'
                      }
                    >
                      <span className="text-xs font-semibold tracking-[0.08em] uppercase">
                        {variant.size}
                      </span>
                      <span className="text-[10px] tracking-[0.12em] opacity-70 uppercase">
                        {variant.color}
                      </span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          <p className="mt-5 text-xs text-zinc-400">
            {selected ? (
              selected.available ? (
                <>
                  En stock · <span className="text-white">{selected.stock}</span>{' '}
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
            disabled
            title="El carrito llega en la Fase 5"
            className="mt-8 h-12 border border-line px-6 text-[11px] font-semibold tracking-[0.2em] uppercase disabled:cursor-not-allowed disabled:text-zinc-500"
          >
            Añadir al carrito
          </button>
          <p className="mt-3 text-[11px] text-zinc-500">
            La compra se habilitará en la Fase 5. Por ahora puedes explorar variantes y stock.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 text-xs">
            <div>
              <dt className="tracking-[0.18em] text-zinc-500 uppercase">SKU</dt>
              <dd className="mt-1 text-zinc-200">{selected?.sku ?? '—'}</dd>
            </div>
            <div>
              <dt className="tracking-[0.18em] text-zinc-500 uppercase">Categoría</dt>
              <dd className="mt-1 text-zinc-200">{product.category.name}</dd>
            </div>
            <div>
              <dt className="tracking-[0.18em] text-zinc-500 uppercase">Equipo</dt>
              <dd className="mt-1 text-zinc-200">{product.team?.name ?? 'Sin equipo'}</dd>
            </div>
            <div>
              <dt className="tracking-[0.18em] text-zinc-500 uppercase">Juego</dt>
              <dd className="mt-1 text-zinc-200">{product.game.name}</dd>
            </div>
          </dl>

          <Link
            to={`/catalogo?game=${product.game.slug}`}
            className="mt-8 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-zinc-300 uppercase underline underline-offset-4 transition-colors hover:text-white"
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
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="aspect-square animate-pulse border border-line bg-surface-2" />
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
      <section className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
        <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">
          {notFound ? '404' : 'Error'}
        </p>
        <h1 className="font-display mt-4 text-3xl uppercase">
          {notFound ? 'Producto no encontrado' : 'No pudimos cargar el producto'}
        </h1>
        <p className="mt-4 text-sm text-zinc-400">
          {notFound
            ? 'Puede que se haya retirado del catálogo o que el enlace esté mal escrito.'
            : productQuery.error.message}
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          {notFound ? null : (
            <button
              type="button"
              onClick={() => productQuery.refetch()}
              className="border border-line px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
            >
              Reintentar
            </button>
          )}
          <Link
            to="/catalogo"
            className="border border-line px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
          >
            Volver al catálogo
          </Link>
        </div>
      </section>
    )
  }

  return <ProductDetailView product={productQuery.data} />
}
