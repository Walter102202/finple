---
name: fraude_suplantacion
description: Activar cuando el usuario describa fraude digital, suplantación de identidad, phishing, vishing, smishing, acceso no autorizado a su cuenta bancaria, robo de credenciales, transferencias no reconocidas, créditos sacados a su nombre, o estafa con plataformas que prometen rentabilidades inverosímiles. Palabras gatillo: me hackearon, robaron mi clave, suplantación, phishing, transferencia que no hice, sacaron crédito a mi nombre, estafa, rentabilidad muy alta.
---

# Skill — Fraude digital y suplantación de identidad

Cuando esta Skill esté activa, sigue este protocolo.

## 1. Triage

Necesitas saber:
- **Qué pasó exactamente**: transferencia no reconocida, contraseña capturada, mail/SMS sospechoso, suplantación documental (RUT usado por otro), crédito sacado a su nombre.
- **Cuándo ocurrió** y si el evento sigue activo (cuenta sigue comprometida).
- **Institución afectada** (banco, fintech RPSF, casa comercial).
- ¿Ya **bloqueó tarjetas/cambió contraseñas**?
- ¿Ya **denunció ante la institución y/o autoridad**? Fechas y respuesta.

Si el riesgo está activo, recomienda primero medidas de contención (bloqueo, cambio de claves) antes de profundizar en el reclamo.

## 2. Marco normativo aplicable

- **Ley 21.459 (Delitos Informáticos)**, vigente desde 20 jun 2022 — fraude informático, acceso ilícito, falsificación informática, uso de datos falsos. Tipos penales aplicables al hecho.
- **Ley 21.234 (Fraudes en medios de pago)** — responsabilidad del emisor por operaciones no reconocidas en tarjetas. **Verifica articulado con search_corpus antes de citar.**
- **Ley 21.663 (Marco de Ciberseguridad / ANCI)** — si la institución es servicio esencial y tuvo brecha, debe reportar al CSIRT (3 h alerta, 72 h descripción, 15 días informe).
- **Ley 21.521 (Fintec)** — exige requisitos de seguridad en fintechs reguladas; revisa que la plataforma esté en RPSF.

## 3. Plazos críticos a verificar con search_corpus

- Plazo para desconocer operación con tarjeta (Ley 21.234) — **verificar con search_corpus**.
- Reporte CSIRT por institución regulada (Ley 21.663): 3 h alerta, 72 h descripción, 15 días informe.
- Denuncia penal: sin plazo formal, pero actuar rápido es clave para investigación.

## 4. Autoridad correspondiente

- **Denuncia penal** → PDI Cibercrimen o Fiscalía Local (Ministerio Público).
- **Reclamo a la institución bancaria** → primero al banco, luego escalar a **CMF** (cmfchile.cl) si la respuesta no llega en 30 días.
- **Incidente de ciberseguridad reportable** (institución regulada) → **CSIRT Nacional** (csirt.gob.cl).
- **Cargo masivo de víctimas / publicidad engañosa** → **SERNAC** (sernac.cl).

## 5. Protocolo obligatorio antes de responder

1. \`search_corpus({ query: "<descripción del fraude>", area: "fraude_suplantacion" })\`.
2. Si menciona una plataforma o fintech específica, sugiere también revisar **alertas CMF** (https://www.cmfchile.cl) y **RPSF**.
3. Si el caso involucra responsabilidad del emisor por operaciones no reconocidas, llama \`read_bcn_law\` con la idNorma de la Ley 21.234 antes de citar artículos.

## 6. Frases prohibidas

- "Es un delito tipificado en el Art. X de la Ley 21.459" sin haber verificado el artículo exacto.
- "Te van a devolver la plata por la Ley X" — promesa de resultado.

## 7. Corpus indexado adicional

Recuperables vía `search_corpus({ area: "fraude_suplantacion" })` y por id:

- **NCG 454 CMF — Gestión de riesgo operacional y ciberseguridad (bancos y entidades supervisadas)** — `read_ncg("454")`.
- **NCG 487 CMF — Información sobre fraudes en transacciones electrónicas (Ley 21.234)** — `read_ncg("487")`. Útil para entender qué reporta la institución cuando hay fraude.
- **NCG 510 CMF — Gestión de riesgo operacional para cooperativas de ahorro y crédito** — `read_ncg("510")`.
- **Dictamen SERNAC 24-feb-2026 — Procedimiento ante fraude en medios de pago y transacciones electrónicas** — `read_dictamen("art-88180")`.
