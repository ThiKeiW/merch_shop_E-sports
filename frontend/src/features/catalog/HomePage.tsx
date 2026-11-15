const games = [
  {
    slug: 'league-of-legends',
    name: 'League of Legends',
    short: 'LoL',
    accent: '#0AC8B9',
    tagline: 'Jerseys, gorras y coleccionables de la grieta.',
  },
  {
    slug: 'valorant',
    name: 'Valorant',
    short: 'VAL',
    accent: '#FF4655',
    tagline: 'Merch de los equipos que dominan el mapa.',
  },
  {
    slug: 'cs2',
    name: 'Counter-Strike 2',
    short: 'CS2',
    accent: '#F5A623',
    tagline: 'Del mousepad al jersey, todo para el clutch.',
  },
  {
    slug: 'dota-2',
    name: 'Dota 2',
    short: 'DOTA',
    accent: '#9B1B30',
    tagline: 'Coleccionables y ediciones limitadas del Ancients.',
  },
]

export function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-10 pb-16 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">
          Tienda oficial de demostración
        </p>
        <h1 className="font-display mt-4 text-4xl leading-[0.95] tracking-tight uppercase sm:text-6xl">
          Merch de tus equipos.
          <span className="block text-zinc-500">Sin fricción.</span>
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400">
          Elige un juego para entrar al catálogo. Los filtros de juego, categoría, subcategoría y
          equipo se acumulan mientras navegas.
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:gap-0">
        {games.map((game) => (
          <a
            key={game.slug}
            href={`/catalogo?game=${game.slug}`}
            className="rayo-panel group relative isolate flex min-h-44 flex-1 overflow-hidden bg-surface-2 p-6 transition-transform duration-300 hover:z-10 md:min-h-96"
            style={{ backgroundColor: `${game.accent}1a` }}
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-40 transition-opacity duration-300 group-hover:opacity-70"
              style={{
                background: `linear-gradient(160deg, ${game.accent}55 0%, transparent 65%)`,
              }}
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-100"
              style={{ backgroundColor: game.accent }}
            />
            <span className="relative flex w-full flex-col justify-between gap-8">
              <span className="font-display text-xs tracking-[0.25em] text-zinc-400 uppercase">
                {game.short}
              </span>
              <span>
                <span className="font-display block text-2xl leading-none uppercase md:text-3xl">
                  {game.name}
                </span>
                <span className="mt-3 block max-w-[22ch] text-xs leading-relaxed text-zinc-400 opacity-100 transition-opacity md:text-sm md:opacity-0 md:group-hover:opacity-100">
                  {game.tagline}
                </span>
                <span
                  className="mt-5 inline-flex items-center gap-2 border px-4 py-2 text-[11px] font-semibold tracking-[0.2em] uppercase transition-colors"
                  style={{ borderColor: game.accent, color: game.accent }}
                >
                  Seleccionar
                  <span aria-hidden>→</span>
                </span>
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
