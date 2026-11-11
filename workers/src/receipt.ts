// Minimal, dependency-free PDF writer for receipts/invoices.
// Produces a single-page A4 PDF with Helvetica text lines.

export interface PdfLine {
  text: string;
  size?: number;
  bold?: boolean;
  gap?: number;
  color?: [number, number, number];
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildPdf(lines: PdfLine[], title = 'CareerCode Academy'): Uint8Array {
  const encoder = new TextEncoder();
  const pageHeight = 842;
  const left = 56;
  let y = pageHeight - 72;
  const ops: string[] = ['BT'];

  for (const line of lines) {
    const size = line.size ?? 11;
    y -= line.gap ?? size + 8;
    const font = line.bold ? '/F2' : '/F1';
    const color = line.color ?? [0.07, 0.09, 0.15];
    ops.push(`${color[0]} ${color[1]} ${color[2]} rg`);
    ops.push(`${font} ${size} Tf`);
    ops.push(`1 0 0 1 ${left} ${y} Tm`);
    ops.push(`(${escapeText(line.text)}) Tj`);
  }
  ops.push('ET');
  const content = ops.join('\n');

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`,
    `<< /Title (${escapeText(title)}) /Producer (CareerCode Academy) >>`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(pdf);
}

export function receiptPdf(input: {
  reference: string;
  date: string;
  customer: string;
  email: string;
  item: string;
  amount: string;
  method: string;
  status: string;
}): Uint8Array {
  return buildPdf([
    { text: 'CareerCode Academy', size: 22, bold: true, gap: 0 },
    { text: 'WID LTD · RC 8824091 · Agbara, Ogun State, Nigeria', size: 9, gap: 18 },
    { text: 'PAYMENT RECEIPT', size: 14, bold: true, gap: 28 },
    { text: `Receipt: ${input.reference}`, size: 10, gap: 22 },
    { text: `Date: ${input.date}`, size: 10, gap: 16 },
    { text: `Billed to: ${input.customer}`, size: 10, gap: 16 },
    { text: `Email: ${input.email}`, size: 10, gap: 16 },
    { text: '------------------------------------------------------------', size: 10, gap: 22 },
    { text: input.item, size: 12, bold: true, gap: 18 },
    { text: `Amount: ${input.amount}`, size: 12, bold: true, gap: 20 },
    { text: `Method: ${input.method}`, size: 10, gap: 16 },
    { text: `Status: ${input.status}`, size: 10, gap: 16 },
    { text: '------------------------------------------------------------', size: 10, gap: 24 },
    { text: 'Thank you for learning with CareerCode Academy.', size: 10, gap: 18 },
    { text: 'This receipt was generated automatically.', size: 8, gap: 14, color: [0.45, 0.48, 0.55] },
  ], `Receipt ${input.reference}`);
}
