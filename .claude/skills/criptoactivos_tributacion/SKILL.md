---
name: criptoactivos_tributacion
description: Activar cuando el usuario describa una operación con criptomonedas (compra, venta, staking, airdrops, mining), una duda tributaria sobre ganancias en cripto, obligaciones de reportería al SII, plataformas de exchange (locales o internacionales), o regulación de proveedores de servicios digitales. Palabras gatillo: bitcoin, ethereum, criptomoneda, cripto, exchange, wallet, staking, airdrop, declaración renta, SII, ganancia cripto, impuesto cripto.
---

# Skill — Criptoactivos y tributación SII

Cuando esta Skill esté activa, sigue este protocolo.

## 1. Triage

Necesitas saber:
- **Qué operación** realizó: compra/venta, staking, conversión entre criptos, retiro a moneda fiat.
- **Plataforma usada** (exchange local, internacional, peer-to-peer).
- **Montos involucrados** y períodos (ej. ganancia neta del año tributario 2025).
- ¿Ya declaró ante SII? ¿Recibió notificación?
- Tipo de usuario: residente / no residente.

## 2. Marco normativo aplicable

- **Ley sobre Impuesto a la Renta (LIR)** — los criptoactivos se gravan como **renta ordinaria** (NO IVA). Ganancia neta en venta = ingreso bruto − costo de adquisición.
- **Resoluciones Exentas SII 113/2025 y 114/2025** — Declaraciones Juradas para proveedores de servicios digitales que reportan transacciones de usuarios residentes y no residentes. **Primera presentación: 30 jun 2026.** https://www.sii.cl/normativa_legislacion/
- **Marco CARF (OCDE)** — alineación internacional de reporte automático de transacciones cripto.
- **Ley 21.521 (Fintec)** — si la plataforma local opera como exchange, debe estar en RPSF (CMF).

## 3. Plazos críticos a verificar con search_corpus

- Plazo de declaración anual de renta: **30 abril del año siguiente**.
- Plazo de la Resolución 113/2025 para primera presentación de DJ: **30 jun 2026**.
- Plazo de respuesta a citación SII: usualmente **30 días** desde notificación.
- Multas por no reportar: 25-100% del impuesto omitido (según Código Tributario).

## 4. Autoridad correspondiente

- **Obligación tributaria / declaración** → **SII** (sii.cl).
- **Plataforma local que se presenta como "exchange regulado"** → verificar **RPSF CMF**; si dice serlo y no está, alerta a la CMF.
- **Estafa con cripto** → derivar a Skill \`fraude_suplantacion\`.

## 5. Protocolo obligatorio antes de responder

1. \`search_corpus({ query: "<operación cripto + tributación>", area: "criptoactivos_tributacion" })\`.
2. Si necesitas verificar texto SII, también puedes consultar https://www.sii.cl/preguntas_frecuentes/criptomonedas/ (FAQ pública SII).
3. Si el caso roza fintech regulada, llama \`read_bcn_law({ idNorma: "1187323" })\` (Ley 21.521) para verificar el alcance.

## 6. Frases prohibidas

- "Las ganancias en cripto están exentas de impuesto" — falso bajo LIR.
- "El SII no fiscaliza cripto en Chile" — falso, las Res. 113/114 establecen reportería obligatoria.
- Promesas tributarias sin cita verificada.

## 7. Próximo paso típico

- Reconstruir bitácora de operaciones (fechas, montos, costos de adquisición, plataformas).
- Calcular ganancia/pérdida neta del año tributario.
- Declarar en la Operación Renta del año siguiente (formulario F22).
- Si recibió notificación SII: revisar plazo y responder por Mi SII dentro del plazo.
