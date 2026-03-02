/**
 * SGD-P Web — PDF Generator
 * Genera documentos según protocolo SST-FR-011
 */

// --- CONFIGURACIÓN MAESTRA ---
const DOC_METADATA = "Codigo SST-FR-011 Version 02 Fecha 01/07/2019";

/**
 * Función base para dibujar el encabezado estándar
 */
function drawHeader(doc, title, company, pageWidth) {
    const margin = 20;
    let y = 15;

    // Metadatos de control (SST-FR-011) en la esquina superior derecha
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text(DOC_METADATA, pageWidth - margin, y, { align: 'right' });
    y += 8;

    // Nombre de la Empresa (Multi-empresa)
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(company || 'SISTEMA DE GESTIÓN DE DOTACIÓN (SGD-P)', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Título del documento
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' });

    return y + 12;
}

/**
 * Genera Recibo de Entrega (Asignación)
 */
function generateAssignmentPDF(data, returnBase64 = false) {
    if (!window.jspdf) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    let y = drawHeader(doc, `RECIBO DE ENTREGA DE DOTACIÓN Y EPP`, data.company, pageWidth);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`ID: ${data.asig_id || ''}`, pageWidth - margin, y - 2, { align: 'right' });

    // INFO TABLE
    const info = [
        ['Fecha/Hora:', data.timestamp || '', 'Entregado por:', data.current_user_email || ''],
        ['Empleado:', `${data.employee_name || 'Empleado'} (${data.employee_id || ''})`, 'Tipo Entrega:', data.delivery_type || ''],
        ['Artículo:', data.item_name || '', 'SKU:', data.sku || ''],
        ['Cantidad:', String(data.quantity || ''), 'Próximo Venc.:', data.due_date || 'N/A']
    ];
    y = drawTable(doc, info, margin, y);

    // LEGAL
    y += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const legal = 'Certifico que he recibido los elementos descritos anteriormente y me comprometo a usarlos de forma obligatoria y adecuada, cumpliendo con las normas de Seguridad y Salud en el Trabajo (SST) de la empresa.';
    const splitLegal = doc.splitTextToSize(legal, pageWidth - margin * 2);
    doc.text(splitLegal, margin, y);
    y += splitLegal.length * 5 + 15;

    // SIGNATURES
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
    const margin = 20;

    let y = drawHeader(doc, `CONSTANCIA DE DEVOLUCIÓN DE EPP`, data.company, pageWidth);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`ID: ${data.dev_id || ''}`, pageWidth - margin, y - 2, { align: 'right' });

    const info = [
        ['Fecha/Hora:', data.timestamp || '', 'Recibido por:', data.current_user_email || ''],
        ['Empleado:', `${data.employee_name || 'Empleado'} (${data.employee_id || ''})`, 'Estado Item:', data.item_condition || ''],
        ['Artículo:', data.item_name || '', 'SKU:', data.sku || ''],
        ['Cantidad:', String(data.quantity || ''), 'ID Asignación:', data.asigOriginalId || 'N/A']
    ];
    y = drawTable(doc, info, margin, y);

    y += 12;
    doc.setFontSize(9);
    const text = 'Se hace entrega de los elementos descritos anteriormente para su reingreso al inventario o disposición final, según el estado reportado.';
    const splitText = doc.splitTextToSize(text, pageWidth - margin * 2);
    doc.text(splitText, margin, y);
    y += splitText.length * 5 + 15;

    y = drawSignatures(doc, data, margin, y, pageWidth);
    return finalizePDF(doc, `Devolucion_${data.dev_id}.pdf`, returnBase64);
}

/**
 * Genera Acta de Eliminación (Disposición Final)
 */
function generateDisposalPDF(data, returnBase64 = false) {
    if (!window.jspdf) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    let y = drawHeader(doc, `ACTA DE ELIMINACIÓN Y DISPOSICIÓN FINAL`, data.company, pageWidth);

    y += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const text = `Por medio de la presente se procede a dar de baja el siguiente material por encontrarse en estado ${data.item_condition || 'No apto'} para su uso.`;
    doc.text(text, margin, y);
    y += 10;

    const info = [
        ['Fecha Acta:', data.timestamp || '', 'SKU:', data.sku || ''],
        ['Artículo:', data.item_name || '', 'Cantidad:', String(data.quantity || '')],
        ['Motivo:', 'Deterioro / Fin de vida útil', 'Destino Final:', 'Bodega de Disposición']
    ];
    y = drawTable(doc, info, margin, y);

    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA RESPONSABLE SST QUE AVALA LA BAJA:', margin, y);
    y += 10;

    if (data.signature_resp_b64) {
        addSignatureImage(doc, data.signature_resp_b64, margin + 20, y, 65, 30);
    }
    y += 35;
    doc.setDrawColor(0);
    doc.line(margin + 20, y, margin + 90, y);
    y += 5;
    doc.setFontSize(9);
    doc.text(String(data.current_user_email || 'Responsable SST').toUpperCase(), margin + 20, y);

    return finalizePDF(doc, `Acta_Eliminacion_${data.sku}.pdf`, returnBase64);
}

// --- UTILS ---

function drawTable(doc, rows, margin, y) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const totalWidth = pageWidth - margin * 2;
    const colWidths = [totalWidth * 0.18, totalWidth * 0.32, totalWidth * 0.18, totalWidth * 0.32];
    const rowHeight = 8;

    doc.setLineWidth(0.1);
    doc.setDrawColor(0);

    rows.forEach(row => {
        let x = margin;
        row.forEach((cell, i) => {
            // Fondo para labels
            if (i % 2 === 0) {
                doc.setFillColor(245, 245, 245);
                doc.rect(x, y - 5, colWidths[i], rowHeight, 'F');
            }
            // Bordes
            doc.rect(x, y - 5, colWidths[i], rowHeight);

            // Texto
            doc.setFontSize(8);
            doc.setFont('helvetica', (i % 2 === 0) ? 'bold' : 'normal');
            doc.setTextColor(0);

            // Padding
            doc.text(String(cell), x + 3, y);
            x += colWidths[i];
        });
        y += rowHeight;
    });
    return y;
}

function drawSignatures(doc, data, margin, y, pageWidth) {
    const sigWidth = 65;
    const sigHeight = 30;
    const leftX = margin + 10;
    const rightX = pageWidth / 2 + 10;

    // Firmas
    if (data.signature_emp_b64) addSignatureImage(doc, data.signature_emp_b64, leftX, y, sigWidth, sigHeight);
    if (data.signature_resp_b64) addSignatureImage(doc, data.signature_resp_b64, rightX, y, sigWidth, sigHeight);

    y += sigHeight + 2;
    doc.setLineWidth(0.5);
    doc.setDrawColor(0);
    doc.line(leftX, y, leftX + sigWidth, y);
    doc.line(rightX, y, rightX + sigWidth, y);

    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('FIRMA DE QUIEN RECIBE', leftX + sigWidth / 2, y, { align: 'center' });
    doc.text('FIRMA DE QUIEN ENTREGA', rightX + sigWidth / 2, y, { align: 'center' });

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const empName = (data.employee_name || 'EMPLEADO').toUpperCase();
    doc.text(empName, leftX + sigWidth / 2, y, { align: 'center' });
    doc.text(String(data.current_user_email || 'SST').toUpperCase(), rightX + sigWidth / 2, y, { align: 'center' });

    return y + 10;
}

function addSignatureImage(doc, b64, x, y, w, h) {
    try {
        const img = b64.startsWith('data:') ? b64 : 'data:image/png;base64,' + b64;
        doc.addImage(img, 'PNG', x, y, w, h);
    } catch (e) { console.error('Sig error', e); }
}

function finalizePDF(doc, filename, returnBase64) {
    if (returnBase64) return doc.output('datauristring').split(',')[1];
    doc.save(filename);
    return true;
}

