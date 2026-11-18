import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ApiError } from '@/shared/api'

import { AdminNav } from './AdminNav'
import {
  createAdminProduct,
  fetchAdminFacets,
  fetchAdminProduct,
  updateAdminProduct,
} from './api'
import type {
  AdminFacets,
  AdminImagePayload,
  AdminProductDetail,
  AdminProductPayload,
  AdminVariantPayload,
} from './types'

let rowKey = 0
const nextKey = () => ++rowKey

type VariantRow = {
  key: number
  sku: string
  size: string
  color: string
  priceDelta: string
  stock: string
}

type ImageRow = {
  key: number
  path: string
  sourceUrl: string
  kind: string
  primary: boolean
}

const IMAGE_KINDS = ['CARD', 'THUMB', 'DETAIL']

function emptyVariant(): VariantRow {
  return { key: nextKey(), sku: '', size: '', color: '', priceDelta: '0.00', stock: '0' }
}

function emptyImage(primary: boolean): ImageRow {
  return { key: nextKey(), path: '', sourceUrl: '', kind: 'CARD', primary }
}

function TextInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  min,
  step,
  maxLength,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  min?: string
  step?: string
  maxLength?: number
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        step={step}
        maxLength={maxLength}
        className="w-full border border-line bg-surface-2 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400"
      />
    </div>
  )
}

function LabeledSelect({
  id,
  label,
  value,
  onChange,
  disabled,
  children,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full border border-line bg-surface-2 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-400 disabled:opacity-50"
      >
        {children}
      </select>
    </div>
  )
}

function ProductForm({ facets, product }: { facets: AdminFacets; product?: AdminProductDetail }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState(product?.name ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [game, setGame] = useState(product?.game ?? facets.games[0]?.slug ?? '')
  const [category, setCategory] = useState(product?.category ?? facets.categories[0]?.slug ?? '')
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? '')
  const [team, setTeam] = useState(product?.team ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [currency, setCurrency] = useState(product?.currency ?? 'EUR')
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [active, setActive] = useState(product?.active ?? true)
  const [variants, setVariants] = useState<VariantRow[]>(
    product && product.variants.length > 0
      ? product.variants.map((variant) => ({
          key: nextKey(),
          sku: variant.sku ?? '',
          size: variant.size,
          color: variant.color,
          priceDelta: String(variant.priceDelta),
          stock: String(variant.stock),
        }))
      : [emptyVariant()],
  )
  const [images, setImages] = useState<ImageRow[]>(
    product?.images.map((image, index) => ({
      key: nextKey(),
      path: image.path,
      sourceUrl: image.sourceUrl ?? '',
      kind: image.kind,
      primary: image.primary || index === 0,
    })) ?? [],
  )
  const [formError, setFormError] = useState<string | null>(null)

  const subcategoryOptions =
    facets.categories.find((item) => item.slug === category)?.subcategories ?? []

  const mutation = useMutation({
    mutationFn: (payload: AdminProductPayload) =>
      product ? updateAdminProduct(product.id, payload) : createAdminProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      navigate('/admin/productos')
    },
  })

  const patchVariant = (key: number, patch: Partial<VariantRow>) => {
    setVariants((current) =>
      current.map((variant) => (variant.key === key ? { ...variant, ...patch } : variant)),
    )
  }

  const patchImage = (key: number, patch: Partial<ImageRow>) => {
    setImages((current) =>
      current.map((image) => (image.key === key ? { ...image, ...patch } : image)),
    )
  }

  const selectPrimary = (key: number) => {
    setImages((current) =>
      current.map((image) => ({ ...image, primary: image.key === key })),
    )
  }

  const removeImage = (key: number) => {
    setImages((current) => {
      const remaining = current.filter((image) => image.key !== key)
      if (remaining.length > 0 && !remaining.some((image) => image.primary)) {
        remaining[0] = { ...remaining[0], primary: true }
      }
      return remaining
    })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const numericPrice = Number(price)
    if (!name.trim() || Number.isNaN(numericPrice) || numericPrice < 0) {
      setFormError('Revisa el nombre y el precio antes de guardar.')
      return
    }

    const incompleteVariant = variants.some(
      (variant) => Boolean(variant.size.trim()) !== Boolean(variant.color.trim()),
    )
    if (incompleteVariant) {
      setFormError('Cada variante necesita talla y color.')
      return
    }

    const variantPayloads: AdminVariantPayload[] = variants
      .filter((variant) => variant.size.trim() && variant.color.trim())
      .map((variant) => ({
        sku: variant.sku.trim() || null,
        size: variant.size.trim(),
        color: variant.color.trim(),
        priceDelta: Number(variant.priceDelta) || 0,
        stock: Number.parseInt(variant.stock, 10) || 0,
      }))

    if (variantPayloads.length === 0) {
      setFormError('Registra al menos una variante con talla y color.')
      return
    }

    let imagePayloads: AdminImagePayload[] = images
      .filter((image) => image.path.trim())
      .map((image) => ({
        path: image.path.trim(),
        sourceUrl: image.sourceUrl.trim() || null,
        kind: image.kind,
        primary: image.primary,
      }))

    if (imagePayloads.length > 0 && !imagePayloads.some((image) => image.primary)) {
      imagePayloads = imagePayloads.map((image, index) => ({ ...image, primary: index === 0 }))
    }

    const payload: AdminProductPayload = {
      slug: slug.trim() || null,
      name: name.trim(),
      description: description.trim() || null,
      game,
      category,
      subcategory: subcategory || null,
      team: team || null,
      price: numericPrice,
      currency: currency.trim().toUpperCase() || 'EUR',
      featured,
      active,
      variants: variantPayloads,
      images: imagePayloads,
    }

    mutation.mutate(payload)
  }

  const mutationError = mutation.error
  const errorMessage =
    formError ??
    (mutationError instanceof ApiError
      ? mutationError.message
      : mutationError
        ? 'No pudimos guardar el producto. Intenta de nuevo.'
        : null)

  const fieldErrors =
    mutationError instanceof ApiError &&
    mutationError.body &&
    typeof mutationError.body === 'object' &&
    'fields' in mutationError.body
      ? Object.entries((mutationError.body as { fields: Record<string, string> }).fields)
      : []

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Staff</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">
        {product ? 'Editar producto' : 'Nuevo producto'}
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        {product
          ? `Actualiza los datos de ${product.name}. El slug se conserva salvo que lo cambies.`
          : 'El slug se genera automáticamente si lo dejas vacío.'}
      </p>

      <div className="mt-8">
        <AdminNav />
      </div>

      <form className="mt-6 space-y-8" onSubmit={submit} noValidate>
        <div className="border border-line bg-surface p-5">
          <h2 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            Datos generales
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextInput
              id="product-name"
              label="Nombre"
              value={name}
              onChange={setName}
              required
              maxLength={200}
            />
            <TextInput
              id="product-slug"
              label="Slug"
              value={slug}
              onChange={setSlug}
              placeholder="se-genera-automaticamente"
              maxLength={160}
            />

            <div className="space-y-2 sm:col-span-2">
              <label
                htmlFor="product-description"
                className="block text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase"
              >
                Descripción
              </label>
              <textarea
                id="product-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                maxLength={5000}
                className="w-full border border-line bg-surface-2 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400"
              />
            </div>

            <LabeledSelect id="product-game" label="Juego" value={game} onChange={setGame}>
              {facets.games.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </LabeledSelect>

            <LabeledSelect
              id="product-category"
              label="Categoría"
              value={category}
              onChange={(value) => {
                setCategory(value)
                setSubcategory('')
              }}
            >
              {facets.categories.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </LabeledSelect>

            <LabeledSelect
              id="product-subcategory"
              label="Subcategoría"
              value={subcategory}
              onChange={setSubcategory}
              disabled={subcategoryOptions.length === 0}
            >
              <option value="">Sin subcategoría</option>
              {subcategoryOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </LabeledSelect>

            <LabeledSelect id="product-team" label="Equipo" value={team} onChange={setTeam}>
              <option value="">Sin equipo</option>
              {facets.teams.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </LabeledSelect>

            <TextInput
              id="product-price"
              label="Precio base"
              type="number"
              value={price}
              onChange={setPrice}
              required
              min="0"
              step="0.01"
            />

            <TextInput
              id="product-currency"
              label="Moneda"
              value={currency}
              onChange={setCurrency}
              maxLength={3}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-xs text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
              />
              Destacado en el catálogo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
              />
              Visible en la tienda
            </label>
          </div>
        </div>

        <div className="border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Variantes
            </h2>
            <button
              type="button"
              onClick={() => setVariants((current) => [...current, emptyVariant()])}
              className="border border-line px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
            >
              Agregar variante
            </button>
          </div>

          <div className="space-y-3 p-5">
            {variants.map((variant, index) => (
              <div
                key={variant.key}
                className="grid gap-3 border border-line/60 p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]"
              >
                <input
                  aria-label={`SKU variante ${index + 1}`}
                  value={variant.sku}
                  onChange={(event) => patchVariant(variant.key, { sku: event.target.value })}
                  placeholder="SKU (opcional)"
                  className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                />
                <input
                  aria-label={`Talla variante ${index + 1}`}
                  value={variant.size}
                  onChange={(event) => patchVariant(variant.key, { size: event.target.value })}
                  placeholder="Talla"
                  required
                  className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                />
                <input
                  aria-label={`Color variante ${index + 1}`}
                  value={variant.color}
                  onChange={(event) => patchVariant(variant.key, { color: event.target.value })}
                  placeholder="Color"
                  required
                  className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                />
                <input
                  aria-label={`Ajuste de precio variante ${index + 1}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.priceDelta}
                  onChange={(event) => patchVariant(variant.key, { priceDelta: event.target.value })}
                  className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                />
                <input
                  aria-label={`Stock variante ${index + 1}`}
                  type="number"
                  min="0"
                  step="1"
                  value={variant.stock}
                  onChange={(event) => patchVariant(variant.key, { stock: event.target.value })}
                  className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                />
                <button
                  type="button"
                  disabled={variants.length === 1}
                  onClick={() =>
                    setVariants((current) => current.filter((item) => item.key !== variant.key))
                  }
                  className="px-2 text-[10px] font-semibold tracking-[0.14em] text-red-300 uppercase disabled:opacity-30"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
              Imágenes
            </h2>
            <button
              type="button"
              disabled={images.length >= 8}
              onClick={() =>
                setImages((current) => [...current, emptyImage(current.length === 0)])
              }
              className="border border-line px-3 py-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-40"
            >
              Agregar imagen
            </button>
          </div>

          {images.length === 0 ? (
            <p className="px-5 py-6 text-xs text-zinc-500">
              Sin imágenes. Puedes usar rutas de <code>/images/products/…</code> o una URL externa.
            </p>
          ) : (
            <div className="space-y-3 p-5">
              {images.map((image, index) => (
                <div
                  key={image.key}
                  className="grid gap-3 border border-line/60 p-3 sm:grid-cols-[2fr_2fr_1fr_auto_auto]"
                >
                  <input
                    aria-label={`Ruta imagen ${index + 1}`}
                    value={image.path}
                    onChange={(event) => patchImage(image.key, { path: event.target.value })}
                    placeholder="/images/products/mi-producto.webp"
                    className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                  />
                  <input
                    aria-label={`Origen imagen ${index + 1}`}
                    value={image.sourceUrl}
                    onChange={(event) => patchImage(image.key, { sourceUrl: event.target.value })}
                    placeholder="URL de origen (opcional)"
                    className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                  />
                  <select
                    aria-label={`Tipo imagen ${index + 1}`}
                    value={image.kind}
                    onChange={(event) => patchImage(image.key, { kind: event.target.value })}
                    className="border border-line bg-surface-2 px-2 py-2 text-xs text-zinc-100"
                  >
                    {IMAGE_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-[10px] tracking-[0.12em] text-zinc-400 uppercase">
                    <input
                      type="radio"
                      name="primary-image"
                      checked={image.primary}
                      onChange={() => selectPrimary(image.key)}
                    />
                    Principal
                  </label>
                  <button
                    type="button"
                    onClick={() => removeImage(image.key)}
                    className="px-2 text-[10px] font-semibold tracking-[0.14em] text-red-300 uppercase"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {errorMessage ? (
          <div role="alert" className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            <p>{errorMessage}</p>
            {fieldErrors.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {fieldErrors.map(([field, message]) => (
                  <li key={field}>
                    <span className="font-semibold">{field}:</span> {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-white px-5 py-3 text-[11px] font-bold tracking-[0.18em] text-ink uppercase transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mutation.isPending ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
          </button>
          <Link
            to="/admin/productos"
            className="text-[11px] font-semibold tracking-[0.16em] text-zinc-400 uppercase hover:text-white"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </section>
  )
}

export function AdminProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)

  const facetsQuery = useQuery({ queryKey: ['admin', 'facets'], queryFn: fetchAdminFacets })
  const productQuery = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => fetchAdminProduct(id as string),
    enabled: isEdit,
  })

  if (facetsQuery.isPending || (isEdit && productQuery.isPending)) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-sm text-zinc-500">Cargando formulario…</p>
      </section>
    )
  }

  const facets = facetsQuery.data
  const product = isEdit ? productQuery.data : undefined

  if (!facets || (isEdit && !product)) {
    return (
      <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <p role="alert" className="text-sm text-red-300">
          No pudimos cargar los datos del producto.
        </p>
        <Link to="/admin/productos" className="mt-4 inline-block text-xs text-zinc-400 underline">
          Volver al listado
        </Link>
      </section>
    )
  }

  return <ProductForm facets={facets} product={product} />
}
