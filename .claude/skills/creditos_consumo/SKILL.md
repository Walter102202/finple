---
name: creditos_consumo
description: Activar cuando el usuario describa un crédito de consumo, hipotecario, automotriz o personal — incluye temas de cuotas, repactaciones, CAE, prepago, portabilidad financiera, certificado de deuda, garantías, codeudores, ofertas crediticias o cobros/intereses asociados a un crédito en banco, casa comercial, cooperativa o fintech. Palabras gatillo: crédito, préstamo, cuota, hipoteca, CAE, prepago, portabilidad, repactación, deuda, codeudor, banco.
---

# Skill — Créditos de consumo y endeudamiento (Chile)

Cuando esta Skill esté activa, sigue este protocolo paso a paso.

## 1. Triage (lo mínimo antes de citar normativa)

Asegúrate de saber:
- **Institución exacta**: banco / casa comercial / cooperativa / fintech registrada en RPSF.
- **Tipo de crédito**: consumo, hipotecario, automotriz, tarjeta de crédito, repactación.
- **Monto y CAE pactado** (vs CAE efectivo cobrado, si aplica).
- **Fecha de firma** y **plazo en cuotas**.
- **Hecho gatillante**: cobro extra, alza unilateral, negativa de prepago, demora en certificado de deuda, ventas atadas (seguro obligatorio), etc.

Si falta lo crítico, pregunta antes de citar normativa.

## 2. Marco normativo aplicable

- **Ley 19.496 (Protección al Consumidor)** — derechos generales, Art. 16 sobre cláusulas abusivas.
- **Ley 20.555 (SERNAC Financiero)** — protección al consumidor de productos financieros.
- **Ley 21.398 (Pro Consumidor)** — análisis obligatorio de solvencia, certificado de deuda en 5 días hábiles, prohibición de ofertas crediticias en establecimientos educacionales, garantía 6 meses sobre productos financieros.
- **Ley 21.236 (Portabilidad Financiera)** — derecho a portar el crédito a otra institución manteniendo condiciones.

## 3. Plazos críticos a verificar con search_corpus antes de afirmar

- Certificado de deuda y liquidación de prepago: **5 días hábiles** (Ley 21.398).
- Respuesta a reclamo formal de la institución: **10 días hábiles** (consulta) / **30 días corridos** (reclamo).
- Derecho a retracto en ventas a distancia o fuera del local: **10 días** desde la firma.

## 4. Autoridad correspondiente

- **Banco / cooperativa / fintech RPSF** y problema regulatorio → **CMF** (https://www.cmfchile.cl/atencion-al-publico).
- **Casa comercial** o problema de derechos del consumidor → **SERNAC** (https://www.sernac.cl).
- **Litigio en curso** → tribunales / abogado, deja de diagnosticar por la vía administrativa.

## 5. Protocolo obligatorio antes de responder

1. Llama \`search_corpus({ query: "<reformulación específica>", area: "creditos_consumo" })\` para anclar la cita.
2. Si search_corpus no devuelve el artículo exacto, llama \`read_bcn_law({ idNorma: "1170464" })\` (Ley 21.398) o \`{ idNorma: "61438" }\` (Ley 19.496) y busca el pasaje.
3. Solo entonces redacta la respuesta en el formato Fase 5 del system prompt.

## 6. Frases prohibidas

- "El artículo X dice…" sin haber llamado primero a `search_corpus`.
- "Te van a devolver la plata" — promesa de resultado.
- "Según la jurisprudencia chilena reciente…" — no tienes acceso a fallos.

## 7. Corpus indexado adicional

Recuperables vía `search_corpus({ area: "creditos_consumo" })` y por id:

- **NCG 484 CMF — Comisiones en operaciones de crédito de dinero (Ley 18.010)** — `read_ncg("484")`. Útil para distinguir cobros legítimos de cobros indebidos sobre créditos.
- **Dictamen SERNAC 31-ene-2022 — Vigencia de cotización y oferta de portabilidad financiera (créditos hipotecarios)** — `read_dictamen("art-64754")`.
- **Dictamen SERNAC 29-abr-2025 — Facultad de Cajas de Compensación para rechazar contratación de seguro de desgravamen** — `read_dictamen("art-84769")`.
