const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

// Builds a simple tailored resume content structure: profile info,
// with overlapping skills/projects surfaced first.
function buildTailoredContent(profile, job) {
  const requiredSkillsLower = (job.requiredSkills || []).map((s) => s.toLowerCase());

  const sortedSkills = [...profile.skills].sort((a, b) => {
    const aMatch = requiredSkillsLower.includes((a.name || '').toLowerCase()) ? 1 : 0;
    const bMatch = requiredSkillsLower.includes((b.name || '').toLowerCase()) ? 1 : 0;
    return bMatch - aMatch;
  });

  const sortedProjects = [...profile.projects].sort((a, b) => {
    const aMatch = requiredSkillsLower.some((skill) =>
      (a.techStack || '').toLowerCase().includes(skill)
    )
      ? 1
      : 0;
    const bMatch = requiredSkillsLower.some((skill) =>
      (b.techStack || '').toLowerCase().includes(skill)
    )
      ? 1
      : 0;
    return bMatch - aMatch;
  });

  return {
    name: profile.name,
    email: profile.email,
    targetJobTitle: job.title,
    skills: sortedSkills,
    projects: sortedProjects,
    experience: profile.experience,
  };
}

async function generatePdf(content) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595, 842]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const margin = 50;
  const lineHeight = 16;

  function drawText(text, { size = 11, bold = false, gap = lineHeight } = {}) {
    if (y < margin) {
      page = pdfDoc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= gap;
  }

  drawText(content.name || 'Candidate', { size: 18, bold: true, gap: 22 });
  drawText(content.email || '', { size: 10, gap: 24 });
  drawText(`Tailored for: ${content.targetJobTitle}`, { size: 10, gap: 24 });

  drawText('Skills', { size: 13, bold: true, gap: 18 });
  drawText(content.skills.map((s) => s.name).join(', ') || 'N/A', { gap: 24 });

  drawText('Experience', { size: 13, bold: true, gap: 18 });
  content.experience.forEach((exp) => {
    drawText(`${exp.role} — ${exp.company} (${exp.years} yrs)`, { gap: lineHeight });
  });
  y -= 8;

  drawText('Projects', { size: 13, bold: true, gap: 18 });
  content.projects.forEach((p) => {
    drawText(`${p.name} — ${p.techStack}`, { bold: true, gap: lineHeight });
    drawText(p.description || '', { size: 10, gap: 20 });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function generateDocx(content) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: content.name || 'Candidate', heading: HeadingLevel.TITLE }),
          new Paragraph({ text: content.email || '' }),
          new Paragraph({ text: `Tailored for: ${content.targetJobTitle}` }),
          new Paragraph({ text: 'Skills', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: content.skills.map((s) => s.name).join(', ') || 'N/A' }),
          new Paragraph({ text: 'Experience', heading: HeadingLevel.HEADING_1 }),
          ...content.experience.map(
            (exp) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `${exp.role} — ${exp.company} (${exp.years} yrs)` }),
                ],
              })
          ),
          new Paragraph({ text: 'Projects', heading: HeadingLevel.HEADING_1 }),
          ...content.projects.flatMap((p) => [
            new Paragraph({ children: [new TextRun({ text: p.name, bold: true })] }),
            new Paragraph({ text: p.techStack || '' }),
            new Paragraph({ text: p.description || '' }),
          ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildTailoredContent, generatePdf, generateDocx };
