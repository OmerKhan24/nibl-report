/**
 * Excel generation using ExcelJS.
 * Returns a Buffer ready to stream as a download.
 */
import ExcelJS from 'exceljs';

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
  currency?: boolean;
}

export async function generateExcel(
  title: string,
  rows: Record<string, unknown>[],
  columns: ExcelColumn[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NIBL Dashboard';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title.slice(0, 31));

  // Header style
  const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

  sheet.columns = columns.map(c => ({
    key: c.key,
    header: c.header,
    width: c.width ?? Math.max(c.header.length + 4, 14),
  }));

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF3b82f6' } },
    };
  });
  headerRow.height = 22;

  // Add data rows
  rows.forEach((row, i) => {
    const r = sheet.addRow(columns.map(c => row[c.key] ?? ''));
    // Alternate row shading
    if (i % 2 === 0) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFF' } };
      });
    }
    // Format currency columns
    columns.forEach((c, ci) => {
      if (c.currency) {
        r.getCell(ci + 1).numFmt = '"PKR "#,##0.00';
      }
    });
    r.height = 18;
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Summary row at bottom
  sheet.addRow([]);
  const sumRow = sheet.addRow(['Total', ...columns.slice(1).map(c =>
    c.currency ? { formula: `SUM(${sheet.getColumn(c.key).letter}2:${sheet.getColumn(c.key).letter}${rows.length + 1})` } : ''
  )]);
  sumRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe2e8f0' } };
  });

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
