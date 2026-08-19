import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function JobMatches() {
  const [jobs, setJobs] = useState(null);
  const [threshold, setThreshold] = useState(40);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get('/jobs/matches')
      .then(({ data }) => {
        setJobs(data.jobs);
        setThreshold(data.threshold);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="card error-text">{error}</div>;
  if (!jobs) return <div className="empty-state">Loading job matches…</div>;

  return (
    <div>
      <h2>Job matches</h2>
      <p style={{ color: '#8b96a8', marginBottom: '1.5rem' }}>
        Ranked by skill overlap with your profile. Jobs at {threshold}% or above are flagged as good fits.
      </p>

      {jobs.length === 0 && (
        <div className="empty-state">No jobs yet. Add some from the backend, or run the seed script.</div>
      )}

      {jobs.map((job) => (
        <div className="card" key={job.id}>
          <div className="card-title-row">
            <div>
              <h3 style={{ marginBottom: '0.15rem' }}>{job.title}</h3>
              <div style={{ color: '#8b96a8', fontSize: '0.88rem' }}>{job.companyName}</div>
            </div>
            <span className={`badge ${job.flagged ? 'flagged' : 'unflagged'}`}>
              <span className="node-dot" style={{ background: job.flagged ? '#0d8f77' : '#8b96a8' }} />
              {job.matchPercent}% match
            </span>
          </div>
          <div style={{ margin: '0.75rem 0' }}>
            {job.requiredSkills.map((s) => (
              <span className="skill-tag" key={s}>{s}</span>
            ))}
          </div>
          {job.flagged && (
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#0d8f77', fontWeight: 600 }}>
                You can apply for this
              </span>
              <Link to={`/skill-gap?jobId=${job.id}`}>
                <button className="secondary">Check fit & generate resume</button>
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
