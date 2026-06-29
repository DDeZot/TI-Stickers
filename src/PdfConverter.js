// PdfConverter.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Equipment from './Equipment';
import { configManager } from './Config';
import './Roboto-Black-normal';

export function generatePdf(equipments, fileName = 'report.pdf') {
  const config = configManager.loadConfig();
  const outputConfig = config.output || {};

  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  doc.setFont('Roboto-Black', 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = outputConfig.margin || 20;
  const gap = outputConfig.gap || 10;
  const colsPerRow = outputConfig.colsPerRow || 3;
  const baseFontSize = outputConfig.fontSize || 10;
  const fontSize = baseFontSize / (outputConfig.fontScale || 1.75);

  const usableWidth = pageWidth - margin * 2 - gap * (colsPerRow - 1);
  const colWidth = usableWidth / colsPerRow;

  doc.setFontSize(fontSize);

  let cursorY = margin;

  const fields = outputConfig.fields || {
    showName: true,
    showInventory: true,
    showPeriod: true,
    showDone: true,
    showNext: true,
    showEngineer: true,
  };

  function drawEquipmentTable(equipment, x, y) {
    const lines = [];
    const linesArray = equipment.toString().split('\n');

    const fieldMapping = [
      { key: 'showName', index: 0 },
      { key: 'showInventory', index: 1 },
      { key: 'showPeriod', index: 2 },
      { key: 'showDone', index: 3 },
      { key: 'showNext', index: 4 },
      { key: 'showEngineer', index: 5 },
    ];

    for (const field of fieldMapping) {
      if (fields[field.key] !== false) {
        const text = linesArray[field.index];
        if (text && text.trim()) {
          lines.push(text);
        }
      }
    }

    if (lines.length === 0) {
      lines.push('Нет данных для отображения');
    }

    const body = lines.map(line => [String(line)]);

    doc.setFont('Roboto-Black', 'normal');
    doc.setFontSize(fontSize);

    autoTable(doc, {
      startY: y,
      margin: { left: x, top: 0, right: 0, bottom: 0 },
      theme: outputConfig.theme || 'grid',
      styles: {
        font: 'Roboto-Black',
        fontSize,
        cellPadding: outputConfig.cellPadding || 3,
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

    const rowSpacing = outputConfig.rowSpacing || 20;
    if (maxBottomY + rowSpacing > pageHeight - margin) {
      doc.addPage();
      cursorY = margin;
    } else {
      cursorY = maxBottomY + rowSpacing;
    }
  }

  doc.save(fileName);
}