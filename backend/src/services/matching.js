const { runQuery } = require('../db');

const MATCH_THRESHOLD = 40; // percent — jobs at or above this are flagged "apply for this"

// Computes the % of a job's required skills the user already has.
async function getMatchScore(userId, jobId) {
  const records = await runQuery(
    `MATCH (j:Job {id: $jobId})
     OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(allReq:Skill)
     WITH j, count(DISTINCT allReq) AS total
     MATCH (u:User {id: $userId})
     OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j)
     RETURN total, count(DISTINCT s) AS matched`,
    { userId, jobId }
  );

  if (records.length === 0) return 0;
  const total = records[0].get('total');
  const matched = records[0].get('matched');
  if (!total || total === 0) return 0;
  return Math.round((matched / total) * 100);
}

module.exports = { getMatchScore, MATCH_THRESHOLD };
