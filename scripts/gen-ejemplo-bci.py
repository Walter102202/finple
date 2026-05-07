"""
Genera un PDF ficticio de ejemplo: cartola/estado de cuenta del BCI mostrando
el cobro mensual de un seguro de desgravamen en un crédito de consumo.

Diseñado para probar la lectura nativa de PDFs del chat de Finple — caso:
"Me cobraron un seguro de desgravamen que nunca pedí en mi crédito de consumo del BCI."

Datos 100% ficticios. RUT enmascarado.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER

OUTPUT = "info/ejemplos/bci-cartola-credito-consumo.pdf"

BCI_BLUE = colors.HexColor("#003DA5")
BCI_LIGHT = colors.HexColor("#E6EEF8")
GREY = colors.HexColor("#666666")
RED = colors.HexColor("#B00020")


def build():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title="BCI - Estado de Cuenta Credito de Consumo",
        author="Banco de Credito e Inversiones",
    )

    styles = getSampleStyleSheet()

    base = ParagraphStyle(
        "base",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=12,
        textColor=colors.black,
    )
    title = ParagraphStyle(
        "title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=BCI_BLUE,
        alignment=TA_LEFT,
        spaceAfter=2,
    )
    sub = ParagraphStyle(
        "sub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=12,
        textColor=GREY,
        alignment=TA_LEFT,
    )
    h2 = ParagraphStyle(
        "h2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=BCI_BLUE,
        spaceBefore=10,
        spaceAfter=4,
    )
    small = ParagraphStyle(
        "small",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=GREY,
    )
    foot = ParagraphStyle(
        "foot",
        parent=small,
        alignment=TA_CENTER,
    )

    story = []

    # Header
    header_data = [
        [
            Paragraph("<b>BCI</b>", title),
            Paragraph(
                "Banco de Credito e Inversiones<br/>"
                "Av. El Golf 125, Las Condes<br/>"
                "Santiago de Chile<br/>"
                "www.bci.cl - Mesa de ayuda 600 824 1234",
                sub,
            ),
        ]
    ]
    header = Table(header_data, colWidths=[5 * cm, 12 * cm])
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(header)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.2, color=BCI_BLUE))
    story.append(Spacer(1, 10))

    story.append(
        Paragraph("ESTADO DE CUENTA - CREDITO DE CONSUMO", h2)
    )
    story.append(
        Paragraph(
            "Periodo: <b>01-04-2026 al 30-04-2026</b> &nbsp; | &nbsp; "
            "Fecha de emision: 02-05-2026 &nbsp; | &nbsp; "
            "N&deg; de cartola: 04/2026",
            base,
        )
    )

    # Datos del cliente
    story.append(Paragraph("Datos del cliente", h2))
    cliente = [
        ["Titular:", "Maria Jose Perez Soto"],
        ["RUT:", "12.345.***-K"],
        ["Direccion:", "Calle Los Almendros 482, Depto. 71, Nunoa"],
        ["Comuna / Region:", "Nunoa / Region Metropolitana"],
        ["Email registrado:", "mj.perez****@gmail.com"],
        ["Sucursal de origen:", "Sucursal Plaza Egana"],
        ["Ejecutivo asignado:", "Andres Quiroga - and.quiroga@bci.cl"],
    ]
    t_cliente = Table(cliente, colWidths=[4.5 * cm, 12.5 * cm])
    t_cliente.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9.5),
                ("FONT", (1, 0), (1, -1), "Helvetica", 9.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(t_cliente)

    # Datos del credito
    story.append(Paragraph("Detalle del credito de consumo", h2))
    credito = [
        ["N&deg; de operacion:", "84-77-2025-09812-3"],
        ["Producto:", "Credito de Consumo en cuotas - Plan Estandar"],
        ["Fecha de cursamiento:", "10-09-2025"],
        ["Monto liquido entregado:", "$ 6.500.000"],
        ["Monto total del credito (CTC):", "$ 8.412.480"],
        ["Numero de cuotas pactadas:", "36 (mensuales)"],
        ["Cuota mensual fija:", "$ 233.680"],
        ["Tasa de interes (mensual):", "1,46% / Tasa anual equivalente: 17,52%"],
        ["CAE informado en simulacion:", "19,8%"],
        ["Cuotas pagadas a la fecha:", "8 de 36"],
        ["Saldo insoluto a hoy:", "$ 5.821.044"],
    ]
    rows_credito = [[Paragraph(c, base) for c in row] for row in credito]
    t_credito = Table(rows_credito, colWidths=[5.5 * cm, 11.5 * cm])
    t_credito.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9.5),
                ("BACKGROUND", (0, 0), (-1, 0), BCI_LIGHT),
                ("BACKGROUND", (0, 2), (-1, 2), BCI_LIGHT),
                ("BACKGROUND", (0, 4), (-1, 4), BCI_LIGHT),
                ("BACKGROUND", (0, 6), (-1, 6), BCI_LIGHT),
                ("BACKGROUND", (0, 8), (-1, 8), BCI_LIGHT),
                ("BACKGROUND", (0, 10), (-1, 10), BCI_LIGHT),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_credito)

    # Detalle de cobros del mes
    story.append(Paragraph("Detalle de cobros - Cuota 8/36 - Vencimiento 15-04-2026", h2))
    cuota_header = ["Concepto", "Detalle", "Monto (CLP)"]
    cuota_rows = [
        ["Capital", "Amortizacion del periodo", "$ 158.420"],
        ["Interes", "Sobre saldo insoluto", "$ 64.760"],
        [
            Paragraph("<b>Seguro de Desgravamen</b>", base),
            Paragraph(
                "Prima mensual - Cobertura: fallecimiento e invalidez total y permanente. "
                "Compania: BCI Seguros Vida S.A. Poliza N&deg; SD-220945-7.",
                base,
            ),
            Paragraph("<b>$ 7.480</b>", base),
        ],
        [
            "Seguro de Cesantia",
            "Prima mensual - Cobertura cesantia involuntaria",
            "$ 2.020",
        ],
        ["Comision por administracion", "Cargo mensual de gestion", "$ 1.000"],
        ["TOTAL CUOTA", "Cargo realizado el 15-04-2026", "$ 233.680"],
    ]
    t_cuota = Table([cuota_header] + cuota_rows, colWidths=[4.5 * cm, 8.5 * cm, 4 * cm])
    t_cuota.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BCI_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9.5),
                ("FONT", (0, 1), (-1, -2), "Helvetica", 9.5),
                ("FONT", (0, -1), (-1, -1), "Helvetica-Bold", 10),
                ("BACKGROUND", (0, -1), (-1, -1), BCI_LIGHT),
                ("BACKGROUND", (0, 3), (-1, 3), colors.HexColor("#FFF6E5")),
                ("ALIGN", (2, 0), (2, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("LINEBELOW", (0, 0), (-1, 0), 0.6, BCI_BLUE),
                ("LINEBELOW", (0, 1), (-1, -2), 0.3, colors.lightgrey),
                ("LINEABOVE", (0, -1), (-1, -1), 0.8, BCI_BLUE),
            ]
        )
    )
    story.append(t_cuota)

    # Bloque de seguros asociados
    story.append(Paragraph("Seguros asociados al credito", h2))
    story.append(
        Paragraph(
            "Los siguientes seguros se encuentran activos y son cobrados como parte de su "
            "cuota mensual. La prima puede ajustarse anualmente segun el saldo insoluto.",
            base,
        )
    )
    story.append(Spacer(1, 4))
    seguros_header = ["Seguro", "Compania", "Poliza", "Prima mensual", "Inicio vigencia"]
    seguros_rows = [
        [
            "Desgravamen",
            "BCI Seguros Vida S.A.",
            "SD-220945-7",
            "$ 7.480",
            "10-09-2025",
        ],
        [
            "Cesantia",
            "BCI Seguros Generales S.A.",
            "CES-118822-1",
            "$ 2.020",
            "10-09-2025",
        ],
    ]
    t_seg = Table([seguros_header] + seguros_rows, colWidths=[3 * cm, 4.5 * cm, 3 * cm, 3 * cm, 3.5 * cm])
    t_seg.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), BCI_BLUE),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9),
                ("FONT", (0, 1), (-1, -1), "Helvetica", 9),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.lightgrey),
            ]
        )
    )
    story.append(t_seg)

    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Total acumulado pagado por concepto de Seguro de Desgravamen "
            "desde el cursamiento del credito (8 cuotas): <b>$ 59.840</b>.",
            base,
        )
    )

    # Footer legal
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.4, color=GREY))
    story.append(Spacer(1, 4))
    story.append(
        Paragraph(
            "Documento informativo. La contratacion de seguros asociados a un credito de consumo "
            "es voluntaria, salvo que la institucion exija una garantia equivalente. Si Ud. ya "
            "cuenta con un seguro de desgravamen vigente puede solicitar la sustitucion sin costo. "
            "Para reclamos comuniquese con su ejecutivo o ingrese a www.bci.cl/atencion-clientes. "
            "Si la respuesta no es satisfactoria puede acudir al SERNAC (sernac.cl) o a la "
            "Comision para el Mercado Financiero (cmfchile.cl) segun corresponda.",
            small,
        )
    )
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "BCI - Banco de Credito e Inversiones - RUT 97.006.000-6 - "
            "Pagina 1 de 1 - Cartola generada electronicamente, no requiere firma.",
            foot,
        )
    )

    doc.build(story)
    print(f"OK -> {OUTPUT}")


if __name__ == "__main__":
    build()
