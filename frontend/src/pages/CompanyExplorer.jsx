import { useEffect, useState } from 'react';
import client from '../api/client';

export default function CompanyExplorer() {
  const [companies, setCompanies] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get('/companies')
      .then(({ data }) => setCompanies(data.companies))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="card error-text">{error}</div>;
  if (!companies) return <div className="empty-state">Loading companies…</div>;

  return (
    <div>
      <h2>Company explorer</h2>
      <p style={{ color: '#8b96a8', marginBottom: '1.5rem' }}>
        Browse companies and the roles they're hiring for.
      </p>

      {companies.length === 0 && <div className="empty-state">No companies yet.</div>}

      {companies.map((c) => (
        <div className="card" key={c.id}>
          <h3>{c.name}</h3>
          {c.jobs.length === 0 ? (
            <p style={{ color: '#8b96a8', fontSize: '0.85rem' }}>No open roles listed.</p>
          ) : (
            c.jobs.map((j) => (
              <div key={j.id} style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #eee' }}>
                <strong>{j.title}</strong>
                <div style={{ marginTop: '0.35rem' }}>
                  {j.requiredSkills.map((s) => (
                    <span className="skill-tag" key={s}>{s}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}
