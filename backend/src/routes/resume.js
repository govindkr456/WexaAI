const express = require('express');
const { runQuery } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');
const { getMatchScore, MATCH_THRESHOLD } = require('../services/matching');
const { buildTailoredContent, generatePdf, generateDocx } = require('../services/docGenerator');

const router = express.Router();
router.use(requireAuth);

async function loadProfile(userId) {
  const records = await runQuery(
    `MATCH (u:User {id: $userId})
     OPTIONAL MATCH (u)-[hs:HAS_SKILL]->(s:Skill)
     OPTIONAL MATCH (u)-[:WORKED_ON]->(p:Project)
     OPTIONAL MATCH (u)-[exp:HAS_EXPERIENCE]->(c:Company)
     RETURN u,
            collect(DISTINCT {name: s.name, level: hs.level}) AS skills,
            collect(DISTINCT {name: p.name, description: p.description, techStack: p.techStack}) AS projects,
            collect(DISTINCT {company: c.name, role: exp.role, years: exp.years}) AS experience`,
    { userId }
  );
  if (records.length === 0) return null;
  const record = records[0];
  const user = record.get('u').properties;
  return {
    name: user.name,
    email: user.email,
    skills: record.get('skills').filter((s) => s.name),
    projects: record.get('projects').filter((p) => p.name),
    experience: record.get('experience').filter((e) => e.company),
  };
}

async function loadJob(jobId) {
  const records = await runQuery(
    `MATCH (j:Job {id: $jobId})
     OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(s:Skill)
     RETURN j, collect(DISTINCT s.name) AS requiredSkills`,
    { jobId }
  );
  if (records.length === 0) return null;
  return { ...records[0].get('j').properties, requiredSkills: records[0].get('requiredSkills') };
}

// GET /resume/generate/:jobId?format=pdf|docx
router.get('/generate/:jobId', async (req, res) => {
  const format = (req.query.format || 'pdf').toLowerCase();

  try {
    const matchPercent = await getMatchScore(req.userId, req.params.jobId);
    if (matchPercent < MATCH_THRESHOLD) {
      return res.status(403).json({
        error: `Match score (${matchPercent}%) is below the ${MATCH_THRESHOLD}% threshold required to generate a tailored resume.`,
      });
    }

    const profile = await loadProfile(req.userId);
    const job = await loadJob(req.params.jobId);
    if (!profile || !job) {
      return res.status(404).json({ error: 'Profile or job not found' });
    }

    const content = buildTailoredContent(profile, job);

    if (format === 'docx') {
      const buffer = await generateDocx(content);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="tailored-resume.docx"');
      return res.send(buffer);
    }

    const buffer = await generatePdf(content);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="tailored-resume.pdf"');
    return res.send(buffer);
  } catch (err) {
    console.error('Resume generation error:', err.message);
    res.status(503).json({ error: 'Could not generate resume. Please try again shortly.' });
  }
});

module.exports = router;
