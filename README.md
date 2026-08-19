# Skill/Job Recommendation Graph

A full-stack app that matches a candidate's skills, projects, and experience against open jobs
using graph traversal — and generates a tailored resume once the fit is strong enough.

## Why a graph database?

The core question this app answers — *"which jobs fit me, and what am I missing?"* — is fundamentally
a question about **relationships between entities**, not rows in a table:

- A user's fit for a job depends on the **overlap** between two sets of relationships (`User -[:HAS_SKILL]->`
  `Skill <-[:REQUIRES_SKILL]- Job`). In SQL, this means a self-join through a bridge table for every
  match check — fine for one job, awkward and slow once you want to rank *every* job by overlap, or
  traverse further (e.g. "jobs at companies where people with my skill profile have worked before").
- Skill gap analysis is a **graph difference**: skills reachable from the Job node but not reachable
  from the User node via `HAS_SKILL`. Expressing "the set difference between two relationship
  traversals" is a single pattern in Cypher; in SQL it's a multi-way `NOT EXISTS` subquery that gets
  harder to read as more entity types (Projects, Experience) get folded in.
- The model naturally grows outward — Companies, Projects, and Experience all hang off the same graph
  without new join tables. Adding "recommend jobs at companies similar to where I've worked" later is a
  new relationship pattern, not a schema migration.

In short: the interesting queries here are 2+ hop traversals and set comparisons across relationships,
which is exactly what a graph database is built for.

## Data model

```
 (User) -[:HAS_SKILL {level}]-> (Skill) <-[:REQUIRES_SKILL {weight}]- (Job) -[:POSTED_BY]-> (Company)
   |
   |-[:WORKED_ON]-> (Project)
   |
   |-[:HAS_EXPERIENCE {role, years}]-> (Company)
```

**Nodes:** `User`, `Skill`, `Job`, `Company`, `Project`
**Relationships:** `HAS_SKILL`, `REQUIRES_SKILL`, `POSTED_BY`, `WORKED_ON`, `HAS_EXPERIENCE`

## Key queries

**Match score (2-hop traversal)** — how much of a job's required skill set the user already has:
```cypher
MATCH (j:Job {id:$jobId})
OPTIONAL MATCH (j)-[:REQUIRES_SKILL]->(allReq:Skill)
WITH j, count(DISTINCT allReq) AS total
MATCH (u:User {id:$userId})
OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)<-[:REQUIRES_SKILL]-(j)
RETURN total, count(DISTINCT s) AS matched
```

**Skill gap (relational-awkward query)** — skills the job requires that the user does *not* have,
expressed as a negative existence check across a traversal:
```cypher
MATCH (j:Job {id:$jobId})-[:REQUIRES_SKILL]->(missing:Skill)
WHERE NOT EXISTS {
  MATCH (u:User {id:$userId})-[:HAS_SKILL]->(missing)
}
RETURN collect(missing.name) AS missingSkills
```

All queries are parameterized through the official Neo4j JavaScript driver — no string-concatenated Cypher.
