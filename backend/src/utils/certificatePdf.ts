import PDFDocument from 'pdfkit';

interface CertificateData {
  user_name: string;
  course_title: string;
  course_category: string;
  verification_code: string;
  issued_at: Date;
  instructor_name?: string;
}

export function generateCertificatePdf(data: CertificateData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    layout: 'landscape',
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Outer border
  doc.lineWidth(2).rect(10, 10, pageWidth - 20, pageHeight - 20).stroke('#1e3a5f');

  // Inner border
  doc.lineWidth(1).rect(20, 20, pageWidth - 40, pageHeight - 40).stroke('#2d5a8e');

  // Decorative top bar
  doc.rect(30, 30, pageWidth - 60, 6).fill('#1e40af');
  doc.rect(30, pageHeight - 36, pageWidth - 60, 6).fill('#1e40af');

  // Header
  doc.fontSize(36).font('Helvetica-Bold').fillColor('#1e3a5f')
    .text('CERTIFICATE', { align: 'center', lineGap: 4 });

  doc.fontSize(14).font('Helvetica').fillColor('#666')
    .text('OF COMPLETION', { align: 'center', lineGap: 20 });

  // Body
  doc.fontSize(12).font('Helvetica').fillColor('#444')
    .text('This is to certify that', { align: 'center', lineGap: 8 });

  doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e40af')
    .text(data.user_name, { align: 'center', lineGap: 10 });

  doc.fontSize(12).font('Helvetica').fillColor('#444')
    .text('has successfully completed the course', { align: 'center', lineGap: 8 });

  doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a5f')
    .text(data.course_title, { align: 'center', lineGap: 10 });

  if (data.course_category) {
    doc.fontSize(11).font('Helvetica').fillColor('#666')
      .text(`Category: ${data.course_category}`, { align: 'center', lineGap: 4 });
  }

  // Date & Verification
  doc.fontSize(10).font('Helvetica').fillColor('#888')
    .text(`Issued on: ${new Date(data.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
      align: 'center',
      lineGap: 4,
    });

  if (data.instructor_name) {
    doc.text(`Instructor: ${data.instructor_name}`, { align: 'center', lineGap: 4 });
  }

  // Verification code at bottom
  doc.fontSize(8).font('Helvetica').fillColor('#aaa')
    .text(`Verification Code: ${data.verification_code}`, { align: 'center', lineGap: 2 });

  doc.fontSize(7).font('Helvetica').fillColor('#bbb')
    .text('Verify at: CareerCode Academy', { align: 'center' });

  return doc;
}
