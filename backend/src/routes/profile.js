const express = require('express');
const crypto = require('crypto');
const { runQuery } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

// GET /profile — full profile: skills, projects, experience
router.get('/', async (req, res) => {
  try {
    const records = await runQuery(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[hs:HAS_SKILL]->(s:Skill)
       OPTIONAL MATCH (u)-[:WORKED_ON]->(p:Project)
       OPTIONAL MATCH (u)-[exp:HAS_EXPERIENCE]->(c:Company)
       RETURN u,
              collect(DISTINCT {name: s.name, level: hs.level}) AS skills,
              collect(DISTINCT {name: p.name, description: p.description, techStack: p.techStack}) AS projects,
              collect(DISTINCT {company: c.name, role: exp.role, years: exp.years}) AS experience`,
      { userId: req.userId }
    );

    if (records.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const record = records[0];
    const user = record.get('u').properties;

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      rawResumeText: user.rawResumeText || '',
      skills: record.get('skills').filter((s) => s.name),
      projects: record.get('projects').filter((p) => p.name),
      experience: record.get('experience').filter((e) => e.company),
    });
  } catch (err) {
    console.error('Get profile error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// PUT /profile/resume — save pasted resume text
router.put('/resume', async (req, res) => {
  const { rawResumeText } = req.body;
  if (typeof rawResumeText !== 'string') {
    return res.status(400).json({ error: 'rawResumeText must be a string' });
  }

  try {
    await runQuery(
      'MATCH (u:User {id: $userId}) SET u.rawResumeText = $rawResumeText',
      { userId: req.userId, rawResumeText }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save resume error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// POST /profile/skills — add or update a skill for the user
// body: { name: string, level: string }
router.post('/skills', async (req, res) => {
  const { name, level } = req.body;
  if (!name) return res.status(400).json({ error: 'Skill name is required' });

  try {
    await runQuery(
      `MERGE (s:Skill {name: $name})
       ON CREATE SET s.id = $skillId
       WITH s
       MATCH (u:User {id: $userId})
       MERGE (u)-[r:HAS_SKILL]->(s)
       SET r.level = $level`,
      { name, level: level || 'intermediate', userId: req.userId, skillId: crypto.randomUUID() }
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add skill error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// DELETE /profile/skills/:name
router.delete('/skills/:name', async (req, res) => {
  try {
    await runQuery(
      `MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(s:Skill {name: $name})
       DELETE r`,
      { userId: req.userId, name: req.params.name }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Delete skill error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// POST /profile/projects — add a past project
// body: { name, description, techStack }
router.post('/projects', async (req, res) => {
  const { name, description, techStack } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });

  try {
    const projectId = crypto.randomUUID();
    await runQuery(
      `MATCH (u:User {id: $userId})
       CREATE (p:Project {id: $projectId, name: $name, description: $description, techStack: $techStack})
       CREATE (u)-[:WORKED_ON]->(p)`,
      {
        userId: req.userId,
        projectId,
        name,
        description: description || '',
        techStack: techStack || '',
      }
    );
    res.status(201).json({ success: true, projectId });
  } catch (err) {
    console.error('Add project error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

// POST /profile/experience — add past experience
// body: { company, role, years }
router.post('/experience', async (req, res) => {
  const { company, role, years } = req.body;
  if (!company) return res.status(400).json({ error: 'Company name is required' });

  try {
    await runQuery(
      `MERGE (c:Company {name: $company})
       ON CREATE SET c.id = $companyId
       WITH c
       MATCH (u:User {id: $userId})
       CREATE (u)-[:HAS_EXPERIENCE {role: $role, years: $years}]->(c)`,
      {
        userId: req.userId,
        company,
        role: role || '',
        years: years || 0,
        companyId: crypto.randomUUID(),
      }
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Add experience error:', err.message);
    res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
  }
});

module.exports = router;
