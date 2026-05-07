'use client'

import { useState } from 'react'
import { Chat } from '@/components/chat'
import { FinpleDog } from '@/components/finple-dog'

export default function Page() {
  const [askPulse, setAskPulse] = useState(0)

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
          <a className="hover:text-ink" href="#ejemplos">
            Ejemplos
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
            <Chat onAsk={() => setAskPulse((n) => n + 1)} />
          </div>
        </div>

        <div className="order-1 flex justify-center md:order-2 md:sticky md:top-12 md:justify-end">
          <FinpleDog askPulse={askPulse} />
        </div>
      </section>

      <ComoFunciona />
      <Ejemplos />
      <Fuentes />

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

function ComoFunciona() {
  const steps = [
    {
      n: '1',
      title: 'Analizar tu caso',
      body: 'Lee tu relato y te lo devuelve en simple. Cierra con un "¿es así?" antes de seguir.',
    },
    {
      n: '2',
      title: 'Preguntar',
      body: 'Solo si es necesario, te consulta lo que falta: institución, producto, fecha, monto, si reclamaste antes.',
    },
    {
      n: '3',
      title: 'Verificar la ley',
      body: 'Identifica el área de tu caso (créditos, cobros, fraude…) y revisa la ley chilena que aplica antes de responder.',
    },
    {
      n: '4',
      title: 'Clasificar',
      body: 'Ubica el caso: tipo de problema, gravedad y autoridad — CMF, SERNAC, SII, ANCI o tribunales.',
    },
    {
      n: '5',
      title: 'Recomendar',
      body: 'Te entrega: qué dice la ley, ante quién reclamar, plazos, derechos y un próximo paso concreto.',
    },
  ]

  return (
    <section id="como-funciona" className="relative mx-auto max-w-6xl px-6 pb-20 pt-4">
      <div className="mb-10">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-clay">
          Cómo funciona
        </p>
        <h2 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
          Te escucho, ordeno tu caso y te muestro la ley.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Finple se preocupa de entender bien tu caso, te ayuda a resolver dudas y te da pasos a
          seguir. Siempre consultando fuentes oficiales y nunca dando un diagnóstico antes de
          entender.
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-2xl border border-ink/10 bg-white/85 p-5 shadow-soft"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-coral/15 font-serif text-sm font-semibold text-coral">
              {s.n}
            </span>
            <h3 className="mt-3 font-serif text-xl font-medium text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-ink-soft/70">
        Cada vez que Finple cita una ley, primero la busca en su biblioteca de normativa chilena
        actualizada. Si el artículo no está, lo descarga directamente desde la página oficial de
        la Biblioteca del Congreso antes de responder.
      </p>
    </section>
  )
}

function Ejemplos() {
  const examples = [
    {
      tag: 'Cobros indebidos',
      question:
        '"Me cobraron un seguro de desgravamen que nunca pedí en mi crédito de consumo del BCI."',
      steps: [
        'Te pide confirmar cómo y cuándo apareció el cobro antes de diagnosticar.',
        'Te explica qué dice la Ley 21.398 sobre ventas atadas y la Ley 19.496 sobre derechos del consumidor.',
        'Te indica cómo reclamar primero al banco y los plazos que tiene para responderte.',
        'Si no resuelven, te deriva a SERNAC y a la CMF con los enlaces oficiales.',
      ],
    },
    {
      tag: 'Fraude y suplantación',
      question:
        '"Me suplantaron y sacaron un crédito a mi nombre en una casa comercial. ¿Qué hago?"',
      steps: [
        'Te pregunta lo mínimo: institución, fecha y si ya hiciste denuncia.',
        'Te explica la Ley 21.234 (qué pagas y qué no cuando hay fraude) y la Ley 21.459 (delitos informáticos).',
        'Te muestra la ruta concreta: denuncia en PDI o Fiscalía y reclamo formal a la CMF.',
        'Te dice qué pedirle al banco hoy: congelar productos y desconocer el crédito.',
      ],
    },
    {
      tag: 'Datos personales',
      question:
        '"Mi banco filtró datos míos. ¿Qué derechos tengo?"',
      steps: [
        'Te explica qué dice hoy la Ley 19.628 sobre tus datos personales.',
        'Te aclara qué cambia con la nueva Ley 21.719 desde el 1 de diciembre de 2026.',
        'Te indica si el caso debe reportarse a la ANCI por ser un incidente de ciberseguridad.',
        'Te orienta a SERNAC o a la CMF según tu relación con la institución.',
      ],
    },
  ]

  return (
    <section id="ejemplos" className="relative mx-auto max-w-6xl px-6 pb-20">
      <div className="mb-10">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-clay">
          Ejemplos de uso
        </p>
        <h2 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
          Tres dudas reales y cómo Finple responde.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Cada respuesta cita la ley con URL oficial. Si Finple no encuentra el artículo
          verificado, lo dice — antes que inventar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {examples.map((e) => (
          <article
            key={e.tag}
            className="flex flex-col rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-soft"
          >
            <span className="inline-flex w-fit items-center rounded-full bg-coral/10 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-coral">
              {e.tag}
            </span>
            <p className="mt-4 font-serif text-lg italic leading-snug text-ink">
              {e.question}
            </p>
            <div className="mt-5 border-t border-ink/10 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                Lo que hace Finple
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-soft">
                {e.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function Fuentes() {
  const leyes = [
    { alias: 'Ley 21.521 — Fintec', area: 'Fintech e inversiones', idNorma: '1187323' },
    { alias: 'Ley 21.398 — Pro Consumidor', area: 'Créditos de consumo', idNorma: '1170464' },
    { alias: 'Ley 19.496 — Protección al Consumidor', area: 'Cobros indebidos', idNorma: '61438' },
    { alias: 'Ley 21.459 — Delitos Informáticos', area: 'Fraude y suplantación', idNorma: '1177743' },
    { alias: 'Ley 19.628 — Protección de Datos', area: 'Datos personales', idNorma: '141599' },
    { alias: 'Ley 21.719 — Nueva Ley de Datos (vig. 1-dic-2026)', area: 'Datos personales', idNorma: '1209272' },
    { alias: 'Ley 21.663 — Marco de Ciberseguridad', area: 'ANCI / ciberincidentes', idNorma: '1202434' },
  ]

  const autoridades = [
    { name: 'CMF', desc: 'Bancos, fintech, valores, seguros.', url: 'https://www.cmfchile.cl' },
    { name: 'SERNAC', desc: 'Derechos del consumidor financiero.', url: 'https://www.sernac.cl' },
    { name: 'SII', desc: 'Tributación, criptoactivos, declaración renta.', url: 'https://www.sii.cl' },
    { name: 'ANCI', desc: 'Ciberincidentes y operadores críticos.', url: 'https://www.anci.gob.cl' },
    { name: 'Superintendencia de Pensiones', desc: 'AFP, multifondos, retiros.', url: 'https://www.spensiones.cl' },
    { name: 'SUSESO', desc: 'Mutualidades, licencias médicas, seguro social.', url: 'https://www.suseso.cl' },
  ]

  return (
    <section id="fuentes" className="relative mx-auto max-w-6xl px-6 pb-24">
      <div className="mb-10">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-clay">
          Fuentes
        </p>
        <h2 className="font-serif text-4xl font-medium tracking-tight md:text-5xl">
          Todo lo que cito está publicado en Chile.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">
          Indexamos directamente los textos oficiales desde la Biblioteca del Congreso (BCN).
          Cuando derivamos a una autoridad, abrimos el canal real de reclamos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-4 font-serif text-xl font-medium text-ink">Leyes indexadas</h3>
          <ul className="space-y-3">
            {leyes.map((l) => (
              <li
                key={l.idNorma}
                className="rounded-xl border border-ink/10 bg-white/85 p-4 shadow-soft"
              >
                <a
                  href={`https://www.bcn.cl/leychile/navegar?idNorma=${l.idNorma}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink hover:text-coral"
                >
                  {l.alias}
                </a>
                <p className="mt-1 text-sm text-ink-soft">{l.area}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-serif text-xl font-medium text-ink">Autoridades a las que derivamos</h3>
          <ul className="space-y-3">
            {autoridades.map((a) => (
              <li
                key={a.name}
                className="rounded-xl border border-ink/10 bg-white/85 p-4 shadow-soft"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-ink hover:text-coral"
                >
                  {a.name}
                </a>
                <p className="mt-1 text-sm text-ink-soft">{a.desc}</p>
              </li>
            ))}
          </ul>

          <h3 className="mt-8 mb-4 font-serif text-xl font-medium text-ink">Acceso al texto legal</h3>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li>
              <a
                href="https://www.bcn.cl/leychile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral underline decoration-coral/40 underline-offset-2 hover:text-sienna"
              >
                BCN · LeyChile
              </a>{' '}
              — texto oficial vía endpoint XML <code className="rounded bg-cream-deep/70 px-1.5 py-0.5 font-mono text-[0.85em]">servicios-leychile.bcn.cl/Consulta/obtxml</code>.
            </li>
            <li>Indexado en Postgres + pgvector (Supabase) con embeddings de OpenAI.</li>
            <li>El agente nunca cita un artículo sin recuperarlo del corpus o de BCN.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
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
