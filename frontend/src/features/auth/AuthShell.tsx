import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type AuthShellProps = {
  children: ReactNode
  image: string
  imageAlt: string
  sideTitle: ReactNode
  sideText: string
}

export function AuthShell({ children, image, imageAlt, sideTitle, sideText }: AuthShellProps) {
  return (
    <section className="bolt-wrap min-h-screen md:flex">
      <div className="bolt-l flex min-h-screen flex-col bg-[#0d1018] px-8 py-8 sm:px-14 md:w-[42%] md:shrink-0 md:pr-28">
        <Link to="/" className="display text-sm tracking-[0.18em]">
          Merch<span className="opacity-50">//</span>Shop
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>

        <Link
          to="/"
          className="text-center text-[0.7rem] font-extrabold tracking-[0.16em] text-white/45 uppercase transition-colors hover:text-white"
        >
          ← Volver a la tienda
        </Link>
      </div>

      <div className="bolt-r login-art relative hidden flex-1 overflow-hidden md:block">
        <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080c]/95 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-12 pl-[120px]">
          <div className="mb-4 flex gap-2">
            <i className="h-1.5 w-10 bg-[#0AC8B9]" />
            <i className="h-1.5 w-10 bg-[#FF4655]" />
            <i className="h-1.5 w-10 bg-[#F5A623]" />
            <i className="h-1.5 w-10 bg-[#9B1B30]" />
          </div>
          <p className="display text-4xl leading-none">{sideTitle}</p>
          <p className="mt-3 text-sm text-white/65">{sideText}</p>
        </div>
      </div>
    </section>
  )
}
