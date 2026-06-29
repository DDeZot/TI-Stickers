import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Equipment from './Equipment';
import './Roboto-Black-normal';

export function generatePdf(equipments, fileName = 'report.pdf') {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  doc.setFont('Roboto-Black', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 20;
  const gap = 10;
  const colsPerRow = 3;
  const usableWidth = pageWidth - margin * 2 - gap * (colsPerRow - 1);
  const colWidth = usableWidth / colsPerRow;

  const baseFontSize = 10;
  const fontSize = baseFontSize / 1.75;
  doc.setFontSize(fontSize);

  let cursorY = margin;

  function drawEquipmentTable(equipment, x, y) {
    const lines = equipment.toString().split('\n');
    const body = lines.map(line => [String(line)]);

    doc.setFont('Roboto-Black', 'normal');
    doc.setFontSize(fontSize);

    autoTable(doc, {
      startY: y,
      margin: { left: x, top: 0, right: 0, bottom: 0 },
      theme: 'grid',
      styles: {
        font: 'Roboto-Black',
        fontSize,
        cellPadding: 3,
        valign: 'middle',
        halign: 'left',
        overflow: 'linebreak',
      },
      headStyles: {
        font: 'Roboto-Black',
        fontStyle: 'normal',
      },
      bodyStyles: {
        font: 'Roboto-Black',
        fontStyle: 'normal',
      },
      tableWidth: colWidth,
      head: [['']],
      body,
      columnStyles: {
        0: { cellWidth: colWidth - 10 }
      }
    });

    return doc.lastAutoTable ? doc.lastAutoTable.finalY : y;
  }

  for (let i = 0; i < equipments.length; i += colsPerRow) {
    let maxBottomY = cursorY;

    for (let col = 0; col < colsPerRow; col++) {
      const idx = i + col;
      if (idx >= equipments.length) break;

      const x = margin + col * (colWidth + gap);
      const y = cursorY;

      const bottomY = drawEquipmentTable(equipments[idx], x, y);
      if (bottomY > maxBottomY) maxBottomY = bottomY;
    }

    if (maxBottomY + 20 > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    } else {
      cursorY = maxBottomY + 20;
    }
  }

  doc.save(fileName);
}
