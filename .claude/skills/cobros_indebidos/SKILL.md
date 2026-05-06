---
name: cobros_indebidos
description: Activar cuando el usuario describa un cobro que considera improcedente, duplicado, sin autorización o por servicio no contratado — incluye seguros que no pidió, comisiones inesperadas, cargos por servicios atados, mantenciones de cuenta, descuentos automáticos no consentidos. Palabras gatillo: cobro indebido, doble cargo, no autoricé, comisión sorpresa, seguro que no pedí, cargo recurrente, suscripción que no contraté, descuento automático.
---

# Skill — Cobros indebidos y servicios no contratados

Cuando esta Skill esté activa, sigue este protocolo.

## 1. Triage

Necesitas saber:
- **Qué se cobró** (monto exacto y concepto que aparece en cartola/comprobante).
- **Cuándo** ocurrió (fecha del cobro o primera aparición).
- **Frecuencia**: una sola vez, mensual, recurrente.
- **Institución** y producto donde ocurre el cobro.
- ¿Hay **autorización previa por escrito o digital**? ¿La conoce el usuario?
- ¿Ya **reclamó a la institución**? ¿Cuándo y qué le respondieron?

## 2. Marco normativo aplicable

- **Ley 19.496 (Protección al Consumidor)**, especialmente Arts. 12, 16 (cláusulas abusivas), 17 (información clara), 23 (responsabilidad del proveedor).
- **Ley 21.398 (Pro Consumidor)** — refuerza obligaciones de información y prohíbe ventas atadas en productos financieros.
- **Ley 20.555 (SERNAC Financiero)** — derecho a recibir información clara antes del cobro.
- **Ley 21.234 (Fraudes en medios de pago)** — responsabilidad por operaciones no reconocidas en tarjetas. **Verifica articulado con search_corpus o read_bcn_law antes de citar artículo específico.**

## 3. Plazos críticos a verificar con search_corpus

- Plazo de la institución para responder reclamo administrativo: ~30 días corridos.
- Plazo del usuario para iniciar reclamo SERNAC tras respuesta insatisfactoria: razonable, idealmente <90 días.
- Operaciones no reconocidas en tarjetas (Ley 21.234): aclaratoria con plazos específicos — **siempre verificar con search_corpus**.

## 4. Autoridad correspondiente

- **Cobros masivos o cláusulas abusivas** → **SERNAC** (sernac.cl) — buen camino para casos de muchas víctimas.
- **Banco / aseguradora / AGF / fintech RPSF** → **CMF** (cmfchile.cl/atencion-al-publico).
- **Posible fraude o suplantación** (cargo no autorizado por delito) → derivar también a la Skill \`fraude_suplantacion\`.

## 5. Protocolo obligatorio antes de responder

1. \`search_corpus({ query: "cobro indebido cláusula abusiva consumidor", area: "cobros_indebidos" })\`.
2. Si el caso involucra tarjeta o medio de pago, verifica responsabilidad con \`read_bcn_law\` apuntando a la Ley 21.234 (verifica idNorma vigente — si no la tienes, indícalo y enlaza https://www.bcn.cl/leychile y pídele al usuario verificar).
3. Solo después, redacta Fase 5.

## 6. Próximo paso típico

- Reclamo formal por escrito a la institución (canal indicado en su web), exigiendo reembolso y respuesta dentro del plazo legal.
- Si en 30 días no hay respuesta o es insatisfactoria → escalar a SERNAC (sernac.cl) o CMF según corresponda.
- Guardar comprobantes (cartola, mensajes, contratos).
