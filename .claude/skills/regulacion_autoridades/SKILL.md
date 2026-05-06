---
name: regulacion_autoridades
description: Activar cuando el usuario pregunte a qué organismo dirigirse, cómo distinguir entre autoridades (CMF vs SERNAC vs SUSESO vs SP vs ANCI vs SII vs tribunales), cómo hacer una consulta ciudadana o solicitud de acceso a información pública, o qué hace cada superintendencia. Palabras gatillo: a quién reclamo, qué autoridad, CMF, SERNAC, SUSESO, Superintendencia de Pensiones, ANCI, SII, dónde denuncio, transparencia, ley de acceso.
---

# Skill — Routing entre autoridades regulatorias chilenas

Cuando esta Skill esté activa, ayuda al usuario a entender la matriz de autoridades y derivarlo correctamente.

## 1. Matriz de competencias

| Situación | Autoridad principal |
|---|---|
| Banco, cooperativa, AGF, fondo mutuo, intermediario de valores, aseguradora, mutuaria, fintech registrada en RPSF | **CMF** — https://www.cmfchile.cl |
| Cobros indebidos, cláusulas abusivas, publicidad engañosa, casos masivos de consumidor | **SERNAC** — https://www.sernac.cl |
| ISAPRE, mutuales, accidentes del trabajo, licencias médicas | **SUSESO** — https://www.suseso.cl |
| AFP, sistema de pensiones | **Superintendencia de Pensiones** — https://www.spensiones.cl |
| Incidente de ciberseguridad reportable, servicio esencial | **CSIRT Nacional / ANCI** — https://csirt.gob.cl · https://anci.gob.cl |
| Tributario (renta, IVA, criptoactivos, boletas) | **SII** — https://www.sii.cl |
| Litigio civil o penal en curso | **Tribunales** (deja de diagnosticar por la vía administrativa) |
| Delito informático (fraude, suplantación, acceso ilícito) | **PDI Cibercrimen** o Fiscalía Local |

## 2. Marco normativo de derivación

- **Ley 21.521 (Fintec)** — competencia CMF sobre fintech reguladas.
- **Ley 20.555 (SERNAC Financiero)** — competencia SERNAC en consumidor financiero.
- **Ley 21.398 (Pro Consumidor)** — fortalece atribuciones SERNAC.
- **Ley 21.663 (Ciberseguridad / ANCI)** — competencia CSIRT/ANCI sobre incidentes en servicios esenciales.
- **Ley 20.285 (Acceso a la Información Pública)** — derecho ciudadano a solicitar información a órganos del Estado.

## 3. Plazos típicos a recordar

- Respuesta a consulta pública CMF: **10 días hábiles**.
- Respuesta a solicitud Ley de Transparencia (Ley 20.285): **20 días hábiles** prorrogables.
- Reclamo SERNAC: la institución tiene **10 días hábiles** para respuesta.

## 4. Cuándo hay derivación múltiple

Algunos casos involucran a más de una autoridad. Ejemplos:
- **Fraude con tarjeta bancaria** → CMF (entidad regulada) + PDI (delito) + posiblemente CSIRT (si hubo brecha).
- **Cobro indebido en banco** → SERNAC (consumidor) + CMF (entidad regulada).
- **Filtración de datos en fintech** → CMF + APDC (desde dic 2026) + CSIRT/ANCI si aplica.

## 5. Protocolo obligatorio antes de responder

1. Identifica claramente la naturaleza del problema antes de derivar (un mismo hecho puede ser regulatorio, de consumidor, penal, etc.).
2. \`search_corpus({ query: "<rol de la autoridad mencionada>", area: "regulacion_autoridades" })\` para anclar competencia exacta si afirmas algo regulatorio específico.
3. Cuando el usuario está confundido entre dos autoridades, explícale en lenguaje ciudadano qué hace cada una y por qué su caso encaja.

## 6. Cómo presentar la derivación al usuario

- Da **el nombre de la autoridad + URL del canal de reclamo o consulta**.
- Indica **plazos** (de la institución y de la autoridad).
- Explica **qué documentación llevar/adjuntar**.
- Aclara que el usuario puede **reclamar primero a la institución** (paso 1 obligatorio en muchos casos) y solo después escalar.
