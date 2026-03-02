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
    doc.text(DOC_METADATA, pageWidth - margin, y, { align: 'right' });
    y += 5;

    // Nombre de la Empresa (Multi-empresa)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(company || 'Sistema de Gestión de Dotación (SGD-P)', pageWidth / 2, y, { align: 'center' });
    y += 8;

    // Título del documento
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, y, { align: 'center' });

    return y + 10;
}

/**
 * Genera Recibo de Entrega (Asignación)
 */
function generateAssignmentPDF(data, returnBase64 = false) {
    if (!window.jspdf) {
        alert('Error: La librería PDF no está disponible.');
        return null;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    let y = drawHeader(doc, `RECIBO DE ENTREGA DE DOTACIÓN Y EPP - ${data.asig_id || ''}`, data.company, pageWidth);

    // INFO TABLE
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const info = [
        ['Fecha/Hora:', data.timestamp || '', 'Entregado por:', data.current_user_email || ''],
        ['Empleado:', `${data.employee_name || ''} (${data.employee_id || ''})`, 'Tipo:', data.delivery_type || ''],
        ['Artículo:', data.item_name || '', 'SKU:', data.sku || ''],
        ['Cantidad:', String(data.quantity || ''), 'Vencimiento:', data.due_date || 'N/A']
    ];
    y = drawTable(doc, info, margin, y);

    // LEGAL
    doc.setFontSize(8);
    y += 10;
    const legal = 'Certifico que he recibido los elementos descritos y me comprometo a usarlos cumpliendo con las normas de SST de la empresa.';
    const splitLegal = doc.splitTextToSize(legal, pageWidth - margin * 2);
    doc.text(splitLegal, margin, y);
    y += splitLegal.length * 4 + 5;

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

    let y = drawHeader(doc, `CONSTANCIA DE DEVOLUCIÓN DE EPP - ${data.dev_id || ''}`, data.company, pageWidth);

    const info = [
        ['Fecha/Hora:', data.timestamp || '', 'Recibido por:', data.current_user_email || ''],
        ['Empleado:', `${data.employee_name || ''} (${data.employee_id || ''})`, 'Estado Item:', data.item_condition || ''],
        ['Artículo:', data.item_name || '', 'SKU:', data.sku || ''],
        ['Cantidad:', String(data.quantity || ''), 'Devolución ID:', data.dev_id || '']
    ];
    y = drawTable(doc, info, margin, y);

    doc.setFontSize(8);
    y += 10;
    doc.text('Se hace entrega de los elementos para su reingreso a stock o disposición final.', margin, y);
    y += 10;

    y = drawSignatures(doc, data, margin, y, pageWidth);
    return finalizePDF(doc, `Devolucion_${data.dev_id}.pdf`, returnBase64);
}

/**
 * Genera Acta de Eliminación (Disposición Final)
 */
function generateDisposalPDF(data, returnBase64 = false) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    let y = drawHeader(doc, `ACTA DE ELIMINACIÓN Y DISPOSICIÓN FINAL`, data.company, pageWidth);

    doc.setFontSize(10);
    const text = `Se procede a dar de baja el siguiente material por encontrarse en estado ${data.item_condition || 'No apto'}.`;
    doc.text(text, margin, y);
    y += 10;

    const info = [
        ['Fecha Acta:', data.timestamp || '', 'SKU:', data.sku || ''],
        ['Artículo:', data.item_name || '', 'Cantidad:', String(data.quantity || '')],
        ['Motivo:', 'Deterioro / Fin de vida útil', 'Destino:', 'Bodega de Disposición Final']
    ];
    y = drawTable(doc, info, margin, y);

    y += 15;
    doc.text('Firma Responsable SST que avala la baja:', margin, y);
    y += 15;

    // Solo firma del responsable
    if (data.signature_resp_b64) {
        addSignatureImage(doc, data.signature_resp_b64, margin + 20, y, 60, 30);
    }
    y += 35;
    doc.line(margin + 20, y, margin + 80, y);
    doc.text(data.current_user_email || 'Responsable SST', margin + 20, y + 5);

    return finalizePDF(doc, `Acta_Eliminacion_${data.sku}.pdf`, returnBase64);
}

// --- UTILS ---

function drawTable(doc, rows, margin, y) {
    const colWidths = [35, 55, 35, 45];
    const rowHeight = 7;
    doc.setFontSize(8);

    rows.forEach(row => {
        let x = margin;
        row.forEach((cell, i) => {
            doc.rect(x, y - 4, colWidths[i], rowHeight);
            doc.setFont('helvetica', (i % 2 === 0) ? 'bold' : 'normal');
            doc.text(String(cell), x + 2, y);
            x += colWidths[i];
        });
        y += rowHeight;
    });
    return y;
}

function drawSignatures(doc, data, margin, y, pageWidth) {
    const sigWidth = 60;
    const sigHeight = 25;
    const leftX = margin + 15;
    const rightX = pageWidth / 2 + 15;

    if (data.signature_emp_b64) addSignatureImage(doc, data.signature_emp_b64, leftX, y, sigWidth, sigHeight);
    if (data.signature_resp_b64) addSignatureImage(doc, data.signature_resp_b64, rightX, y, sigWidth, sigHeight);

    y += sigHeight + 2;
    doc.setDrawColor(0);
    doc.line(leftX, y, leftX + sigWidth, y);
    doc.line(rightX, y, rightX + sigWidth, y);

    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Firma de Quien Recibe', leftX + sigWidth / 2, y, { align: 'center' });
    doc.text('Firma de Quien Entrega', rightX + sigWidth / 2, y, { align: 'center' });

    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(data.employee_name || 'Empleado', leftX + sigWidth / 2, y, { align: 'center' });
    doc.text(data.current_user_email || 'Responsable SST', rightX + sigWidth / 2, y, { align: 'center' });

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

