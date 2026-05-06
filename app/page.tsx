import { Chat } from '@/components/chat'
import { FinpleDog } from '@/components/finple-dog'

export default function Page() {
  return (
    <main className="relative min-h-screen">
      <BackgroundGlow />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2 text-sm font-medium tracking-wide text-ink-soft">
          <span className="inline-block h-2 w-2 rounded-full bg-coral" />
          <span>Claude Impact Lab · Línea 01 — Inclusión Financiera</span>
        </div>
        <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
          <a className="hover:text-ink" href="#como-funciona">
            Cómo funciona
          </a>
          <a className="hover:text-ink" href="#fuentes">
            Fuentes
          </a>
        </nav>
      </header>

      <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-6 pb-24 pt-12 md:grid-cols-[1.25fr_1fr] md:gap-16 md:pt-20">
        <div className="order-2 md:order-1">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-clay">
            Para dudas de luca$
          </p>

          <div className="inline-block">
            <h1 className="font-serif text-7xl font-medium leading-none tracking-tight md:text-[8.5rem]">
              <span className="text-coral">FIN</span>
              <span className="text-ink">PLE</span>
            </h1>

            <p className="mt-7 text-center font-serif text-2xl italic tracking-wide text-ink-soft md:text-3xl">
              <span className="font-semibold text-coral">Fin</span>
              <span>anzas en sim</span>
              <span className="font-semibold text-ink">ple</span>
              <span aria-hidden>.</span>
            </p>
          </div>

          <p className="mt-10 max-w-xl text-lg leading-relaxed text-ink-soft md:text-xl">
            Cuéntame en tus palabras lo que te tiene dudando con tu plata — aunque no sepas
            explicarlo bien. Si tienes papeles (un contrato, una cartola, una carta del banco),
            adjúntalos. Te respondo claro y corto, con la ley chilena y las fuentes oficiales
            detrás de cada afirmación.
          </p>

          <div className="mt-8">
            <Chat />
          </div>
        </div>

        <div className="order-1 flex justify-center md:order-2 md:sticky md:top-12 md:justify-end">
          <FinpleDog />
        </div>
      </section>

      <footer className="relative mx-auto max-w-6xl px-6 pb-10 text-xs text-ink-soft/70">
        <div className="flex flex-col items-start justify-between gap-2 border-t border-ink/10 pt-6 md:flex-row md:items-center">
          <span>
            Hecho con Claude · CMF · SERNAC · BCN. Las respuestas citan la fuente oficial cuando
            existe.
          </span>
          <span>© 2026 Finple — prototipo Impact Lab</span>
        </div>
      </footer>
    </main>
  )
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-coral/15 blur-3xl" />
      <div className="absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-tan/40 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(25,25,25,0.06) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
    </div>
  )
}
