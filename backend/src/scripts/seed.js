// Loads realistic seed data: Skills, Companies, and Jobs with REQUIRES_SKILL edges.
// Does NOT seed Users — users sign up through the app so their password hashing/auth flow is exercised.
// Run with: npm run seed

require('dotenv').config();
const crypto = require('crypto');
const { runQuery, driver } = require('../db');

const jobs = [
  {
    title: 'Frontend Engineer',
    company: 'Northwind Labs',
    description:
      'Build responsive UIs with React, collaborate with design, own component architecture and state management.',
    skills: ['React', 'JavaScript', 'CSS', 'REST APIs', 'Git'],
  },
  {
    title: 'Full Stack Developer',
    company: 'Northwind Labs',
    description:
      'Work across a Node.js backend and React frontend, design REST APIs, write Cypher queries against our graph database.',
    skills: ['React', 'Node.js', 'JavaScript', 'Express', 'Graph Databases'],
  },
  {
    title: 'Backend Engineer (Node.js)',
    company: 'Vertex Systems',
    description:
      'Own backend services in Node.js and Express, design database schemas, implement authentication and authorization.',
    skills: ['Node.js', 'Express', 'JWT', 'REST APIs', 'SQL'],
  },
  {
    title: 'Cloud & DevOps Engineer',
    company: 'Vertex Systems',
    description:
      'Manage AWS infrastructure, CI/CD pipelines, containerization with Docker, and monitoring for production systems.',
    skills: ['AWS', 'Docker', 'CI/CD', 'Linux', 'Terraform'],
  },
  {
    title: 'Technical Project Manager',
    company: 'Brightpath Solutions',
    description:
      'Lead cross-functional engineering teams, own sprint planning, stakeholder communication, and delivery timelines.',
    skills: ['Project Management', 'Agile', 'JIRA', 'Stakeholder Communication'],
  },
  {
    title: 'AI-Integrated Frontend Developer',
    company: 'Brightpath Solutions',
    description:
      'Build React interfaces that integrate LLM-powered features, prompt design, and AI API orchestration.',
    skills: ['React', 'JavaScript', 'AI APIs', 'Prompt Engineering', 'REST APIs'],
  },
  {
    title: 'Graph Database Engineer',
    company: 'DataMesh Inc',
    description:
      'Design and optimize graph data models, write performant Cypher queries, and build APIs on top of a Bolt-protocol graph database.',
    skills: ['Graph Databases', 'Cypher', 'Node.js', 'Data Modeling'],
  },
  {
    title: 'React Native Developer',
    company: 'DataMesh Inc',
    description: 'Build cross-platform mobile apps in React Native, integrate REST APIs, and ship to app stores.',
    skills: ['React Native', 'JavaScript', 'REST APIs', 'Mobile UI'],
  },
];

async function seed() {
  console.log('Seeding database...');

  // Clear existing Job/Company/Skill data so re-running the script is idempotent.
  // Users are left untouched.
  await runQuery('MATCH (j:Job) DETACH DELETE j');
  await runQuery('MATCH (c:Company) DETACH DELETE c');
  await runQuery('MATCH (s:Skill) WHERE NOT (s)<-[:HAS_SKILL]-(:User) DETACH DELETE s');

  for (const job of jobs) {
    await runQuery(
      `MERGE (c:Company {name: $company})
       ON CREATE SET c.id = $companyId
       WITH c
       CREATE (j:Job {id: $jobId, title: $title, description: $description, postedDate: datetime()})
       CREATE (j)-[:POSTED_BY]->(c)
       WITH j
       UNWIND $skills AS skillName
       MERGE (s:Skill {name: skillName})
       ON CREATE SET s.id = randomUUID()
       MERGE (j)-[:REQUIRES_SKILL]->(s)`,
      {
        company: job.company,
        companyId: crypto.randomUUID(),
        jobId: crypto.randomUUID(),
        title: job.title,
        description: job.description,
        skills: job.skills,
      }
    );
    console.log(`  Seeded: ${job.title} @ ${job.company}`);
  }

  console.log(`Done. Seeded ${jobs.length} jobs across companies with skill relationships.`);
  await driver.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
