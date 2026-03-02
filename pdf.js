/**
 * SGD-P Web — PDF Receipt Generator (Client-side)
 * Genera recibos de asignación usando jsPDF
 */

function generateAssignmentPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'letter');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // ===== HEADER =====
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Sistema de Gestión de Dotación y EPP (SGD-P)', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.text(`Recibo de Entrega de EPP - ${data.asig_id || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // ===== INFO TABLE =====
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const infoFields = [
        ['Fecha y Hora:', data.timestamp || '', 'Entregado por:', data.current_user_email || ''],
        ['ID Empleado:', data.employee_id || '', 'Tipo Entrega:', data.delivery_type || ''],
        ['SKU Entregado:', data.sku || '', 'Artículo:', data.item_name || ''],
        ['Cantidad:', String(data.quantity || ''), 'Vencimiento aprox:', data.due_date || 'N/A']
    ];

    const colWidths = [35, 50, 35, 50];
    const rowHeight = 8;

    // Light background for info table
    doc.setFillColor(245, 245, 250);
    doc.rect(margin, y - 2, colWidths.reduce((a, b) => a + b, 0), infoFields.length * rowHeight + 2, 'F');

    doc.setDrawColor(200, 200, 210);

    for (let row = 0; row < infoFields.length; row++) {
        let xPos = margin;
        for (let col = 0; col < 4; col++) {
            // Draw cell border
            doc.rect(xPos, y - 2, colWidths[col], rowHeight);

            if (col === 0 || col === 2) {
                doc.setFont('helvetica', 'bold');
            } else {
                doc.setFont('helvetica', 'normal');
            }

            doc.text(infoFields[row][col], xPos + 2, y + 3);
            xPos += colWidths[col];
        }
        y += rowHeight;
    }

    y += 8;

    // ===== NOTES =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notas:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.notes || 'Ninguna', margin + 15, y);
    y += 10;

    // ===== LEGAL TEXT =====
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const legalText = 'Con la firma de este documento, el empleado certifica que ha recibido el o los ' +
        'elementos de protección personal descritos y se compromete a hacer uso adecuado ' +
        'y mantenimiento oportuno de los mismos según las políticas de la compañía y ' +
        'la normatividad de SST vigente.';

    const splitLegal = doc.splitTextToSize(legalText, pageWidth - margin * 2);
    doc.text(splitLegal, margin, y);
    y += splitLegal.length * 4 + 15;

    // ===== SIGNATURES =====
    const sigWidth = 60;
    const sigHeight = 30;
    const leftSigX = margin + 20;
    const rightSigX = pageWidth / 2 + 20;

    // Signature images
    if (data.signature_emp_b64) {
        try {
            const empImgData = data.signature_emp_b64.startsWith('data:')
                ? data.signature_emp_b64
                : 'data:image/png;base64,' + data.signature_emp_b64;
            doc.addImage(empImgData, 'PNG', leftSigX, y, sigWidth, sigHeight);
        } catch (e) {
            doc.text('(Firma no disponible)', leftSigX, y + 15);
        }
    }

    if (data.signature_resp_b64) {
        try {
            const respImgData = data.signature_resp_b64.startsWith('data:')
                ? data.signature_resp_b64
                : 'data:image/png;base64,' + data.signature_resp_b64;
            doc.addImage(respImgData, 'PNG', rightSigX, y, sigWidth, sigHeight);
        } catch (e) {
            doc.text('(Firma no disponible)', rightSigX, y + 15);
        }
    }

    y += sigHeight + 3;

    // Signature lines
    doc.setDrawColor(100, 100, 100);
    doc.line(leftSigX, y, leftSigX + sigWidth, y);
    doc.line(rightSigX, y, rightSigX + sigWidth, y);
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Firma Empleado', leftSigX + sigWidth / 2, y, { align: 'center' });
    doc.text('Firma Responsable SST', rightSigX + sigWidth / 2, y, { align: 'center' });
    y += 4;
    doc.setFontSize(7);
    doc.text(`ID: ${data.employee_id || ''}`, leftSigX + sigWidth / 2, y, { align: 'center' });
    doc.text(data.current_user_email || '', rightSigX + sigWidth / 2, y, { align: 'center' });

    // ===== SAVE =====
    const filename = `Recibo_${data.asig_id || 'EPP'}_${data.employee_id || ''}.pdf`;
    doc.save(filename);
}
