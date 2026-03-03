/**
 * SGD-P Web — PDF Generator (v3.0 Premium Redesign)
 * Genera documentos según protocolo SST-FR-011 con estética corporativa.
 */

// --- CONFIGURACIÓN DE ESTILO ---
const COLORS = {
    primary: [31, 41, 55],       // Gris azulado muy oscuro (#1f2937)
    accent: [79, 70, 229],        // Indigo (#4f46e5)
    lightIndigo: [238, 242, 255], // Indigo muy claro (#eef2ff)
    text: [55, 65, 81],           // Gris de texto (#374151)
    label: [107, 114, 128],       // Gris de etiquetas (#6b7280)
    border: [229, 231, 235],      // Gris de borde (#e5e7eb)
    white: [255, 255, 255]
};

const DOC_METADATA = "Codigo SST-FR-011 | Version 02 | Fecha 01/07/2019";

/**
 * Dibuja un encabezado profesional con bloques de color y jerarquía clara
 */
function drawHeader(doc, title, company, pageWidth) {
    const margin = 15;

    // 1. Bloque de Fondo para el Encabezado
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // 2. Metadatos (SST) - Texto blanco discreto
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(DOC_METADATA, pageWidth - margin, 12, { align: 'right' });

    // 3. Nombre de la Empresa - Grande y Blanco
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text((company || 'SISTEMA DE GESTIÓN DE DOTACIÓN').toUpperCase(), margin, 25);

    // 4. Título del Documento - Banner Acento
    doc.setFillColor(...COLORS.accent);
    doc.rect(margin, 30, 100, 8, 'F');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), margin + 5, 35.5);

    return 55; // Nueva posición Y base
}

/**
 * Genera Recibo de Entrega (Asignación) - Rediseño detallado
 */
function generateAssignmentPDF(data, returnBase64 = false) {
    if (!window.jspdf) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    let y = drawHeader(doc, "Recibo de Entrega de Dotación y EPP", data.company, pageWidth);

    // --- BLOQUE 1: DATOS GENERALES ---
    y = drawSectionTitle(doc, "INFORMACIÓN DEL REGISTRO", margin, y);
    const row1 = [
        { label: "ID ASIGNACIÓN", value: data.asig_id || 'N/A' },
        { label: "FECHA Y HORA", value: data.timestamp || 'N/A' },
        { label: "RESPONSABLE SST", value: data.responsible_name || data.current_user_email || 'N/A' }
    ];
    y = drawInfoCards(doc, row1, margin, y, pageWidth);
    y += 8;

    // --- BLOQUE 2: DATOS DEL EMPLEADO ---
    y = drawSectionTitle(doc, "INFORMACIÓN DEL EMPLEADO", margin, y);
    const row2 = [
        { label: "NOMBRE COMPLETO", value: (data.employee_name || 'Empleado').toUpperCase() },
        { label: "CÉDULA / ID", value: data.employee_id || 'N/A' },
        { label: "TIPO DE ENTREGA", value: data.delivery_type || 'Dotación Periódica' }
    ];
    y = drawInfoCards(doc, row2, margin, y, pageWidth);
    y += 8;

    // --- BLOQUE 3: DETALLE DEL ARTÍCULO ---
    y = drawSectionTitle(doc, "DETALLE DEL ELEMENTO ENTREGADO", margin, y);
    const itemData = [
        ["ARTÍCULO", "SKU / REFERENCIA", "CANTIDAD", "PRÓXIMO VENC."],
        [data.item_name || 'N/A', data.sku || 'N/A', String(data.quantity || '0'), data.due_date || 'N/A']
    ];
    y = drawTable(doc, itemData, margin, y, pageWidth);

    // --- LEGALES ---
    y += 15;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    const legalText = "Certifico que he recibido los elementos descritos anteriormente y me comprometo a usarlos de forma obligatoria y adecuada durante mi jornada laboral, cumpliendo con las normas de Seguridad y Salud en el Trabajo (SST) vigentes en la empresa. La pérdida o mal uso por negligencia podrá ser causal de procesos disciplinarios según el RIO.";
    const splitLegal = doc.splitTextToSize(legalText, pageWidth - margin * 2);
    doc.text(splitLegal, margin, y);
    y += splitLegal.length * 4.5 + 15;

    // --- FIRMAS ---
    y = drawSignatures(doc, data, margin, y, pageWidth);

    return finalizePDF(doc, `Recibo_${data.asig_id}.pdf`, returnBase64);
}

/**
 * Genera Recibo de Devolución
 */
function generateReturnPDF(data, returnBase64 = false) {
    if (!window.jspdf) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    let y = drawHeader(doc, "Constancia de Devolución de EPP", data.company, pageWidth);

    y = drawSectionTitle(doc, "DETALLE DE DEVOLUCIÓN", margin, y);
    const row1 = [
        { label: "ID DEVOLUCIÓN", value: data.dev_id || 'N/A' },
        { label: "ESTADO DEL ITEM", value: data.item_condition || 'N/A' },
        { label: "RESPONSABLE", value: data.responsible_name || data.current_user_email || 'N/A' }
    ];
    y = drawInfoCards(doc, row1, margin, y, pageWidth);
    y += 8;

    y = drawSectionTitle(doc, "DATOS DEL ELEMENTO", margin, y);
    const itemData = [
        ["ARTÍCULO", "SKU", "CANTIDAD", "ID ASIG. ORIGINAL"],
        [data.item_name || 'N/A', data.sku || 'N/A', String(data.quantity || '0'), data.asigOriginalId || 'N/A']
    ];
    y = drawTable(doc, itemData, margin, y, pageWidth);

    y += 15;
    doc.setFontSize(9);
    doc.text("Se deja constancia de la devolución de los elementos arriba mencionados para su custodia o baja definitiva.", margin, y);
    y += 20;

    y = drawSignatures(doc, data, margin, y, pageWidth);
    return finalizePDF(doc, `Devolucion_${data.dev_id}.pdf`, returnBase64);
}

/**
 * Genera Acta de Eliminación / Disposición Final
 */
function generateDisposalPDF(data, returnBase64 = false) {
    if (!window.jspdf) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    let y = drawHeader(doc, "Acta de Disposición Final de Residuos", data.company, pageWidth);

    y = drawSectionTitle(doc, "INFORMACIÓN DE LA BAJA", margin, y);
    const row1 = [
        { label: "MÉTODO", value: data.method || 'ELIMINACIÓN' },
        { label: "ID PROCESO", value: data.dev_id || data.sku || 'N/A' },
        { label: "FECHA", value: data.timestamp || 'N/A' }
    ];
    y = drawInfoCards(doc, row1, margin, y, pageWidth);
    y += 8;

    y = drawSectionTitle(doc, "ARTÍCULO ELIMINADO", margin, y);
    const itemData = [
        ["ARTÍCULO", "SKU", "CANTIDAD", "UBICACIÓN"],
        [data.item_name || 'N/A', data.sku || 'N/A', String(data.quantity || '0'), 'ALMACÉN BAJA']
    ];
    y = drawTable(doc, itemData, margin, y, pageWidth);

    y += 15;
    doc.setFontSize(9);
    const notesText = "OBSERVACIONES: " + (data.notes || "Se procede a la eliminación física del elemento por encontrarse en condiciones no aptas para el servicio.");
    const splitNotes = doc.splitTextToSize(notesText, pageWidth - margin * 2);
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * 5 + 15;

    y = drawSignatures(doc, data, margin, y, pageWidth);
    return finalizePDF(doc, `Acta_Eliminacion_${data.sku}.pdf`, returnBase64);
}

// --- COMPONENTES UI PDF ---

function drawSectionTitle(doc, title, margin, y) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.accent);
    doc.text(title, margin, y);
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, margin + 20, y + 1.5);
    return y + 6;
}

function drawInfoCards(doc, items, margin, y, pageWidth) {
    const cardWidth = (pageWidth - (margin * 2)) / items.length;
    items.forEach((item, i) => {
        let x = margin + (i * cardWidth);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.label);
        doc.text(item.label, x, y);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.primary);
        doc.text(String(item.value), x, y + 4.5);
    });
    return y + 8;
}

function drawTable(doc, rows, margin, y, pageWidth) {
    const tableWidth = pageWidth - (margin * 2);
    const colWidth = tableWidth / rows[0].length;
    const rowHeight = 10;

    // Header de Tabla
    doc.setFillColor(...COLORS.lightIndigo);
    doc.rect(margin, y, tableWidth, rowHeight, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.accent);

    rows[0].forEach((header, i) => {
        doc.text(header, margin + (i * colWidth) + 3, y + 6.5);
    });

    // Filas (Dato)
    y += rowHeight;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);

    for (let i = 1; i < rows.length; i++) {
        rows[i].forEach((cell, j) => {
            doc.text(String(cell), margin + (j * colWidth) + 3, y + 6.5);
        });
        y += rowHeight;
    }

    // Línea inferior de tabla
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, y, margin + tableWidth, y);

    return y;
}

function drawSignatures(doc, data, margin, y, pageWidth) {
    const sigWidth = 60;
    const sigHeight = 25;
    const spacing = 20;
    const startX = (pageWidth - (sigWidth * 2 + spacing)) / 2;

    // Bloque Firma 1
    if (data.signature_emp_b64) {
        addSignatureImage(doc, data.signature_emp_b64, startX, y, sigWidth, sigHeight);
    }
    doc.setDrawColor(...COLORS.text);
    doc.setLineWidth(0.5);
    doc.line(startX, y + sigHeight, startX + sigWidth, y + sigHeight);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text("FIRMA DEL EMPLEADO", startX + sigWidth / 2, y + sigHeight + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(String(data.employee_id || ''), startX + sigWidth / 2, y + sigHeight + 8, { align: 'center' });

    // Bloque Firma 2
    const secondX = startX + sigWidth + spacing;
    if (data.signature_resp_b64) {
        addSignatureImage(doc, data.signature_resp_b64, secondX, y, sigWidth, sigHeight);
    }
    doc.line(secondX, y + sigHeight, secondX + sigWidth, y + sigHeight);
    doc.setFont('helvetica', 'bold');
    doc.text("RECIBIDO / DESPACHADO POR", secondX + sigWidth / 2, y + sigHeight + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    // Mostrar nombre completo si existe
    doc.text(String(data.responsible_name || data.current_user_email || 'SST'), secondX + sigWidth / 2, y + sigHeight + 8, { align: 'center' });

    return y + sigHeight + 15;
}

function addSignatureImage(doc, b64, x, y, w, h) {
    try {
        const img = b64.indexOf('data:') === 0 ? b64 : 'data:image/png;base64,' + b64;
        doc.addImage(img, 'PNG', x, y, w, h);
    } catch (e) {
        console.error('PDF Sig Error:', e);
    }
}

function finalizePDF(doc, filename, returnBase64) {
    if (returnBase64) return doc.output('datauristring').split(',')[1];
    doc.save(filename);
    return true;
}

