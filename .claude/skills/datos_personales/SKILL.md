---
name: datos_personales
description: Activar cuando el usuario describa una preocupación sobre sus datos personales, filtración o brecha, derecho de acceso, rectificación o cancelación (ARCO), tratamiento sin consentimiento, transferencia internacional de datos, datos biométricos, o derecho al olvido. Palabras gatillo: mis datos, filtración, brecha, ARCO, borrar mis datos, rectificar, consentimiento, biométricos, datos personales, privacidad.
---

# Skill — Protección de datos personales

Cuando esta Skill esté activa, sigue este protocolo.

## 1. Triage

Necesitas saber:
- **Qué dato está en juego** (RUT, datos bancarios, biométricos, salud, ubicación, etc.).
- **Quién lo trata**: banco, fintech, ISAPRE, AFP, retailer, plataforma digital.
- **Hecho específico**: filtración pública, uso para fines no autorizados, negativa a borrar/rectificar, transferencia internacional sin aviso.
- ¿Ya **ejerció derecho ARCO ante el responsable**? Fechas y respuesta.

## 2. Marco normativo aplicable

**Importante:** Chile está en transición regulatoria.

- **Ley 19.628 (Protección de la Vida Privada / Protección de Datos)** — vigente **hasta el 30 de noviembre de 2026**. Es el régimen que aplica HOY.
- **Ley 21.719 (Nueva Ley de Datos Personales)** — promulgada en diciembre 2024, **entra en vigencia el 1 de diciembre de 2026**. Crea la Agencia de Protección de Datos Personales (APDC), amplía derechos ARCO+, exige notificación de brechas, evaluaciones de impacto. https://www.bcn.cl/leychile/navegar?idNorma=1209272
- **NCG 502 CMF + Manual SIF** — requisitos de confidencialidad para fintech reguladas.

Si el usuario pregunta por algo que ocurre HOY (mayo 2026) → cita Ley 19.628. Si pregunta sobre obligaciones de la institución desde **dic 2026 en adelante** → cita Ley 21.719.

## 3. Plazos críticos a verificar con search_corpus

- Plazo del responsable para responder solicitud de acceso (Ley 19.628) — **verificar artículo exacto con search_corpus**.
- Plazo para rectificación o cancelación.
- Plazo para denuncia ante autoridad.

## 4. Autoridad correspondiente

- **Hoy (régimen Ley 19.628)** → tribunales civiles para habeas data; SERNAC para casos de consumidor.
- **Desde 1 dic 2026 (Ley 21.719)** → **APDC (Agencia de Protección de Datos Personales)**, autoridad autónoma.
- **Si la entidad es financiera regulada** → **CMF** también puede intervenir por requisitos de confidencialidad.
- **Brecha en servicio esencial / institución regulada** → reporte adicional al **CSIRT Nacional / ANCI**.

## 5. Protocolo obligatorio antes de responder

1. \`search_corpus({ query: "<derecho ARCO o brecha que aplica>", area: "datos_personales" })\`.
2. Si necesitas el articulado de la Ley 19.628 vigente, llama \`read_bcn_law({ idNorma: "141599" })\`.
3. Para texto de la nueva Ley 21.719, \`read_bcn_law({ idNorma: "1209272" })\` — recordándole al usuario que entra en vigencia el 1 dic 2026.

## 6. Frases prohibidas

- "La APDC ya recibe denuncias" antes del 1 dic 2026 — la agencia aún no opera.
- "Tu derecho está protegido por el Art. X de la Ley 21.719" para hechos ocurridos hoy — esa ley aún no rige.

## 7. Corpus indexado adicional

Dictámenes interpretativos SERNAC disponibles en el corpus (recuperables vía `search_corpus({ area: "datos_personales" })` o `read_dictamen`):

- **Dictamen SERNAC 12-ago-2021 — Información y tratamiento de datos personales (Ley 19.496)** — `read_dictamen("art-63093")`.
- **Dictamen SERNAC 11-abr-2022 — Aplicabilidad de la Ley del Consumidor en plataformas y redes sociales (datos personales)** — `read_dictamen("art-65306")`.
