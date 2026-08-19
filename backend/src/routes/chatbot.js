const express = require('express');
const { runQuery } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');
const { getMatchScore, MATCH_THRESHOLD } = require('../services/matching');

const router = express.Router();
router.use(requireAuth);

// POST /chatbot/query
// Called by a Wexa Coworker Skill (configured as a REST call to this endpoint).
// Wexa's LLM layer handles the natural-language understanding; this endpoint
// just exposes structured graph data the Coworker can reason over and reply with.
// body: { intent: 'job_matches' | 'skill_gap', jobId?: string }
router.post('/query', async (req, res) => {
  const { intent, jobId } = req.body;

  try {
    if (intent === 'job_matches') {
      const records = await runQuery(
        `MATCH (j:Job)-[:POSTED_BY]->(c:Company)
         OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(s:Skill)
         RETURN j, c.name AS companyName, collect(DISTINCT s.name) AS requiredSkills`
      );
      const jobs = await Promise.all(
        records.map(async (r) => {
          const job = r.get('j').properties;
          const matchPercent = await getMatchScore(req.userId, job.id);
          return { title: job.title, company: r.get('companyName'), matchPercent };
        })
      );
      const flagged = jobs.filter((j) => j.matchPercent >= MATCH_THRESHOLD);
      return res.json({ jobs, flagged, threshold: MATCH_THRESHOLD });
    }

    if (intent === 'skill_gap') {
      if (!jobId) return res.status(400).json({ error: 'jobId is required for skill_gap intent' });
      const records = await runQuery(
        `MATCH (j:Job {id: $jobId})-[:REQUIRES_SKILL]->(missing:Skill)
         WHERE NOT EXISTS {
           MATCH (u:User {id: $userId})-[:HAS_SKILL]->(missing)
         }
         RETURN collect(missing.name) AS missingSkills`,
        { jobId, userId: req.userId }
      );
      return res.json({ missingSkills: records[0]?.get('missingSkills') || [] });
    }

    return res.status(400).json({ error: 'Unknown intent. Use job_matches or skill_gap.' });
  } catch (err) {
    console.error('Chatbot query error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

module.exports = router;
