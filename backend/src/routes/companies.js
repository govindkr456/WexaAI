const express = require('express');
const { runQuery } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

// GET /companies — all companies, each with its jobs and required skills
router.get('/', async (req, res) => {
  try {
    const companies = await runQuery('MATCH (c:Company) RETURN c');

    const result = await Promise.all(
      companies.map(async (r) => {
        const company = r.get('c').properties;
        const jobRecords = await runQuery(
          `MATCH (j:Job)-[:POSTED_BY]->(c:Company {id: $companyId})
           OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(s:Skill)
           RETURN j, collect(DISTINCT s.name) AS requiredSkills`,
          { companyId: company.id }
        );
        return {
          ...company,
          jobs: jobRecords.map((jr) => ({
            ...jr.get('j').properties,
            requiredSkills: jr.get('requiredSkills'),
          })),
        };
      })
    );

    res.json({ companies: result });
  } catch (err) {
    console.error('List companies error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

module.exports = router;
