const express = require('express');
const crypto = require('crypto');
const { runQuery } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');
const { getMatchScore, MATCH_THRESHOLD } = require('../services/matching');

const router = express.Router();
router.use(requireAuth);

// GET /jobs — list all jobs with their company and required skills
router.get('/', async (req, res) => {
  try {
    const records = await runQuery(
      `MATCH (j:Job)-[:POSTED_BY]->(c:Company)
       OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(s:Skill)
       RETURN j, c.name AS companyName, collect(DISTINCT s.name) AS requiredSkills
       ORDER BY j.postedDate DESC`
    );

    const jobs = records.map((r) => ({
      ...r.get('j').properties,
      companyName: r.get('companyName'),
      requiredSkills: r.get('requiredSkills'),
    }));

    res.json({ jobs });
  } catch (err) {
    console.error('List jobs error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// POST /jobs — create a job with required skills
// body: { title, description, companyName, requiredSkills: string[] }
router.post('/', async (req, res) => {
  const { title, description, companyName, requiredSkills } = req.body;
  if (!title || !companyName || !Array.isArray(requiredSkills)) {
    return res.status(400).json({ error: 'title, companyName, and requiredSkills[] are required' });
  }

  try {
    const jobId = crypto.randomUUID();
    await runQuery(
      `MERGE (c:Company {name: $companyName})
       ON CREATE SET c.id = $companyId
       WITH c
       CREATE (j:Job {id: $jobId, title: $title, description: $description, postedDate: datetime()})
       CREATE (j)-[:POSTED_BY]->(c)
       WITH j
       UNWIND $requiredSkills AS skillName
       MERGE (s:Skill {name: skillName})
       ON CREATE SET s.id = randomUUID()
       MERGE (j)-[:REQUIRES_SKILL]->(s)`,
      {
        jobId,
        title,
        description: description || '',
        companyName,
        companyId: crypto.randomUUID(),
        requiredSkills,
      }
    );
    res.status(201).json({ success: true, jobId });
  } catch (err) {
    console.error('Create job error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// GET /jobs/matches — every job with a match % for the logged-in user, flagged above threshold
router.get('/matches', async (req, res) => {
  try {
    const records = await runQuery(
      `MATCH (j:Job)-[:POSTED_BY]->(c:Company)
       OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(s:Skill)
       RETURN j, c.name AS companyName, collect(DISTINCT s.name) AS requiredSkills`
    );

    const jobs = await Promise.all(
      records.map(async (r) => {
        const job = r.get('j').properties;
        const matchPercent = await getMatchScore(req.userId, job.id);
        return {
          ...job,
          companyName: r.get('companyName'),
          requiredSkills: r.get('requiredSkills'),
          matchPercent,
          flagged: matchPercent >= MATCH_THRESHOLD,
        };
      })
    );

    jobs.sort((a, b) => b.matchPercent - a.matchPercent);
    res.json({ jobs, threshold: MATCH_THRESHOLD });
  } catch (err) {
    console.error('Job matches error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// GET /jobs/:id/skill-gap — skills the job requires that the user doesn't have (multi-hop traversal)
router.get('/:id/skill-gap', async (req, res) => {
  try {
    const records = await runQuery(
      `MATCH (j:Job {id: $jobId})-[:REQUIRES_SKILL]->(missing:Skill)
       WHERE NOT EXISTS {
         MATCH (u:User {id: $userId})-[:HAS_SKILL]->(missing)
       }
       RETURN collect(missing.name) AS missingSkills`,
      { jobId: req.params.id, userId: req.userId }
    );

    const matchPercent = await getMatchScore(req.userId, req.params.id);
    res.json({
      missingSkills: records[0]?.get('missingSkills') || [],
      matchPercent,
    });
  } catch (err) {
    console.error('Skill gap error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

module.exports = router;
