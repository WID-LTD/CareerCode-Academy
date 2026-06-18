import PDFDocument from 'pdfkit';

export interface CertificatePdfData {
  user_name: string;
  course_title: string;
  verification_code: string;
  issued_at: Date;
  instructor_name?: string;
  org_name?: string;
  org_rc?: string;
  logoBuffer?: Buffer | null;
  signatureBuffer?: Buffer | null;
  stampBuffer?: Buffer | null;
  show_stamp?: boolean;
  show_signature?: boolean;
}

export function generateCertificatePdf(data: CertificatePdfData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  });

  const pw = doc.page.width;
  const ph = doc.page.height;
  const cx = pw / 2;

  // ── Outer border ──
  doc.lineWidth(2).rect(10, 10, pw - 20, ph - 20).stroke('#1e3a5f');

  // ── Inner border ──
  doc.lineWidth(1).rect(20, 20, pw - 40, ph - 40).stroke('#2d5a8e');

  // ── Corner ornaments ──
  const ornSize = 20;
  doc.lineWidth(2).strokeColor('#c0a060');
  // top-left
  doc.moveTo(25, 25 + ornSize).lineTo(25, 25).lineTo(25 + ornSize, 25).stroke();
  // top-right
  doc.moveTo(pw - 25 - ornSize, 25).lineTo(pw - 25, 25).lineTo(pw - 25, 25 + ornSize).stroke();
  // bottom-left
  doc.moveTo(25, ph - 25 - ornSize).lineTo(25, ph - 25).lineTo(25 + ornSize, ph - 25).stroke();
  // bottom-right
  doc.moveTo(pw - 25 - ornSize, ph - 25).lineTo(pw - 25, ph - 25).lineTo(pw - 25, ph - 25 - ornSize).stroke();

  // ── Top decorative bar ──
  doc.rect(30, 30, pw - 60, 4).fill('#1e40af');
  doc.rect(30, ph - 34, pw - 60, 4).fill('#1e40af');

  // ── Logo at top center ──
  let yPos = 60;
  if (data.logoBuffer) {
    try {
      const logoWidth = 160;
      const logoHeight = 50;
      doc.image(data.logoBuffer, cx - logoWidth / 2, yPos, {
        width: logoWidth, height: logoHeight,
      });
      yPos += logoHeight + 10;
    } catch {
      // skip logo if invalid
    }
  } else {
    yPos += 10;
  }

  // ── Header ──
  doc.fontSize(34).font('Helvetica-Bold').fillColor('#1e3a5f')
    .text('CERTIFICATE', cx, yPos, { align: 'center', lineGap: 2 });
  doc.fontSize(13).font('Helvetica').fillColor('#6b7280')
    .text('OF COMPLETION', { align: 'center', lineGap: 16 });

  // ── Body ──
  doc.fontSize(11).font('Helvetica').fillColor('#4b5563')
    .text('This is to certify that', { align: 'center', lineGap: 6 });

  doc.fontSize(26).font('Helvetica-Bold').fillColor('#1e40af')
    .text(data.user_name, { align: 'center', lineGap: 8 });

  doc.fontSize(11).font('Helvetica').fillColor('#4b5563')
    .text('has successfully completed the course', { align: 'center', lineGap: 6 });

  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e3a5f')
    .text(data.course_title, { align: 'center', lineGap: 10 });

  // ── Instructor (if provided) ──
  const instructorLabel = data.instructor_name || 'Udokamma Emmanuel';
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
    .text(`Instructor: ${instructorLabel}`, { align: 'center', lineGap: 4 });

  // ── Issue date ──
  const dateStr = new Date(data.issued_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
    .text(`Issued: ${dateStr}`, { align: 'center', lineGap: 14 });

  // ── Signature & Stamp side by side ──
  const showSig = data.show_signature !== false && data.signatureBuffer;
  const showStp = data.show_stamp !== false && data.stampBuffer;
  const sigW = 140;
  const sigH = 50;
  const stpW = 100;
  const stpH = 100;
  const imgY = doc.y + 5;

  if (showSig || showStp) {
    const totalW = (showSig ? sigW : 0) + (showStp ? stpW : 0) + 40;
    const startX = cx - totalW / 2;

    if (showSig) {
      try {
        doc.image(data.signatureBuffer!, startX, imgY, {
          width: sigW, height: sigH,
        });
      } catch { /* skip */ }
    }

    if (showStp) {
      const stpX = showSig ? startX + sigW + 40 : startX;
      try {
        doc.image(data.stampBuffer!, stpX, imgY, {
          width: stpW, height: stpH,
        });
      } catch { /* skip */ }
    }

    doc.y = imgY + Math.max(showSig ? sigH : 0, showStp ? stpH : 0) + 8;
  }

  // ── Organization details ──
  const orgName = data.org_name || 'Career Code WID Ltd';
  const orgRc = data.org_rc || 'RC 8824091';
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a5f')
    .text(orgName, { align: 'center', lineGap: 2 });
  doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
    .text(orgRc, { align: 'center', lineGap: 10 });

  // ── Verification code ──
  doc.fontSize(7).font('Helvetica').fillColor('#9ca3af')
    .text(`Verification Code: ${data.verification_code}`, { align: 'center', lineGap: 2 });
  doc.fontSize(6).font('Helvetica').fillColor('#b0b0b0')
    .text('Verify at: CareerCode Academy', { align: 'center' });

  return doc;
}

export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
