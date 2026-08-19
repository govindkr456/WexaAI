const express = require('express');
const { runQuery } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');
const { getMatchScore, MATCH_THRESHOLD } = require('../services/matching');
const { getAtsScore } = require('../services/atsScore');

const router = express.Router();
router.use(requireAuth);

// GET /scoring/:jobId — match % + ATS score for the logged-in user against a job
router.get('/:jobId', async (req, res) => {
  try {
    const userRecords = await runQuery(
      'MATCH (u:User {id: $userId}) RETURN u.rawResumeText AS rawResumeText',
      { userId: req.userId }
    );
    const jobRecords = await runQuery(
      `MATCH (j:Job {id: $jobId})
       OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(s:Skill)
       RETURN j.description AS description, collect(DISTINCT s.name) AS requiredSkills`,
      { jobId: req.params.jobId }
    );

    if (jobRecords.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const rawResumeText = userRecords[0]?.get('rawResumeText') || '';
    const description = jobRecords[0].get('description');
    const requiredSkills = jobRecords[0].get('requiredSkills');

    const matchPercent = await getMatchScore(req.userId, req.params.jobId);
    const { atsScore, breakdown } = getAtsScore(rawResumeText, description, requiredSkills);

    res.json({
      matchPercent,
      atsScore,
      breakdown,
      resumeGenerationUnlocked: matchPercent >= MATCH_THRESHOLD,
      threshold: MATCH_THRESHOLD,
    });
  } catch (err) {
    console.error('Scoring error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

module.exports = router;
