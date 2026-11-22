import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

const games = [
  {
    slug: 'league-of-legends',
    name: 'League of Legends',
    short: 'LoL',
    cover: '/assets/covers/lol.jpg',
    accent: '#0AC8B9',
    fg: '#07080c',
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    short: 'VAL',
    cover: '/assets/covers/val.jpg',
    accent: '#FF4655',
    fg: '#ffffff',
  },
  {
    slug: 'cs2',
    name: 'Counter-Strike 2',
    short: 'CS2',
    cover: '/assets/covers/cs2.jpg',
    accent: '#F5A623',
    fg: '#07080c',
  },
  {
    slug: 'dota-2',
    name: 'Dota 2',
    short: 'DOTA',
    cover: '/assets/covers/dota.jpg',
    accent: '#9B1B30',
    fg: '#ffffff',
  },
]

export function HomePage() {
  return (
    <section>
      <div className="relative h-[64svh] min-h-[440px] overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,#16213a,#07080c_70%)]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/assets/covers/lol.jpg"
        >
          <source src="/assets/hero.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-[#07080c]" />
        <div className="relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-4 pb-12 md:px-8">
          <p className="text-[0.7rem] font-extrabold tracking-[0.3em] text-white/60 uppercase">
            Tienda oficial de demostración
          </p>
          <h1 className="display mt-3 text-5xl leading-[0.95] md:text-8xl">
            Merch de tus equipos.
            <br />
            <span className="text-white/45">Sin fricción.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">
            Elige un juego para entrar al catálogo. Los filtros de juego, categoría, subcategoría y
            equipo se acumulan mientras navegas.
          </p>
          <div className="mt-6">
            <Link to="/catalogo" className="bevel bevel-p">
              Ver todo el catálogo <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {games.map((game) => (
          <Link
            key={game.slug}
            to={`/catalogo?game=${game.slug}`}
            className="panel group relative block overflow-hidden"
            style={{ '--g': game.accent, '--gf': game.fg } as CSSProperties}
          >
            <img
              src={game.cover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-700"
            />
            <div className="shade absolute inset-0" />
            <div className="body absolute inset-x-0 bottom-0 flex flex-col items-start gap-4">
              <span
                className="text-[0.7rem] font-extrabold tracking-[0.3em] uppercase"
                style={{ color: game.accent }}
              >
                {game.short}
              </span>
              <h2 className="display text-3xl leading-none md:text-4xl">{game.name}</h2>
              <span className="bevel bevel-g">
                Seleccionar <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
