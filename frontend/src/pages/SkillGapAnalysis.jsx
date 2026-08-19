import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '../api/client';

export default function SkillGapAnalysis() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('jobId') || '');
  const [gap, setGap] = useState(null);
  const [scoring, setScoring] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    client.get('/jobs').then(({ data }) => setJobs(data.jobs)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;
    setError(null);
    Promise.all([
      client.get(`/jobs/${selectedJobId}/skill-gap`),
      client.get(`/scoring/${selectedJobId}`),
    ])
      .then(([gapRes, scoreRes]) => {
        setGap(gapRes.data);
        setScoring(scoreRes.data);
      })
      .catch((err) => setError(err.message));
  }, [selectedJobId]);

  async function handleGenerate(format) {
    setGenerating(true);
    setError(null);
    try {
      const res = await client.get(`/resume/generate/${selectedJobId}?format=${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `tailored-resume.${format === 'docx' ? 'docx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <h2>Skill gap analysis</h2>
      <p style={{ color: '#8b96a8', marginBottom: '1.5rem' }}>
        Pick a job to see exactly what's missing, plus your match and ATS scores before generating a resume.
      </p>

      <div className="card">
        <label htmlFor="job-select">Job</label>
        <select
          id="job-select"
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #d7d5cd' }}
        >
          <option value="">Select a job…</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} — {j.companyName}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      {scoring && (
        <div className="score-panel">
          <div className="score-item">
            <div className="value">{scoring.matchPercent}%</div>
            <div className="label">Match score</div>
          </div>
          <div className="score-item">
            <div className="value">{scoring.atsScore}%</div>
            <div className="label">ATS score</div>
          </div>
        </div>
      )}

      {gap && (
        <div className="card">
          <h3>Missing skills</h3>
          {gap.missingSkills.length === 0 ? (
            <p style={{ color: '#0d8f77', fontSize: '0.9rem' }}>You have every required skill for this job.</p>
          ) : (
            <div>
              {gap.missingSkills.map((s) => (
                <span className="skill-tag missing" key={s}>{s}</span>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.25rem' }}>
            {scoring?.resumeGenerationUnlocked ? (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button className="primary" disabled={generating} onClick={() => handleGenerate('pdf')}>
                  {generating ? 'Generating…' : 'Generate resume (PDF)'}
                </button>
                <button className="secondary" disabled={generating} onClick={() => handleGenerate('docx')}>
                  {generating ? 'Generating…' : 'Generate resume (Word)'}
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#8b96a8' }}>
                Resume generation unlocks once your match score reaches {scoring?.threshold}%.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
