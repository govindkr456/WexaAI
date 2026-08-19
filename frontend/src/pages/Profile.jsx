import { useEffect, useState } from 'react';
import client from '../api/client';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [skillName, setSkillName] = useState('');
  const [projectForm, setProjectForm] = useState({ name: '', description: '', techStack: '' });
  const [expForm, setExpForm] = useState({ company: '', role: '', years: '' });

  async function loadProfile() {
    try {
      const { data } = await client.get('/profile');
      setProfile(data);
      setResumeText(data.rawResumeText || '');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function saveResume() {
    setSaving(true);
    setSavedMsg('');
    try {
      await client.put('/profile/resume', { rawResumeText: resumeText });
      setSavedMsg('Resume saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addSkill(e) {
    e.preventDefault();
    if (!skillName.trim()) return;
    try {
      await client.post('/profile/skills', { name: skillName.trim() });
      setSkillName('');
      loadProfile();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeSkill(name) {
    try {
      await client.delete(`/profile/skills/${encodeURIComponent(name)}`);
      loadProfile();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addProject(e) {
    e.preventDefault();
    if (!projectForm.name.trim()) return;
    try {
      await client.post('/profile/projects', projectForm);
      setProjectForm({ name: '', description: '', techStack: '' });
      loadProfile();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addExperience(e) {
    e.preventDefault();
    if (!expForm.company.trim()) return;
    try {
      await client.post('/profile/experience', { ...expForm, years: Number(expForm.years) || 0 });
      setExpForm({ company: '', role: '', years: '' });
      loadProfile();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !profile) {
    return <div className="card error-text">{error}</div>;
  }

  if (!profile) return <div className="empty-state">Loading your profile…</div>;

  return (
    <div>
      <h2>Your profile</h2>
      <p style={{ color: '#8b96a8', marginBottom: '1.5rem' }}>
        Paste your resume once and add structured details — this feeds every job match and skill gap check.
      </p>

      <div className="card">
        <h3>Resume</h3>
        <textarea
          rows={8}
          placeholder="Paste your full resume text here…"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
        <button className="primary" onClick={saveResume} disabled={saving}>
          {saving ? 'Saving…' : 'Save resume'}
        </button>
        {savedMsg && <span style={{ marginLeft: '0.75rem', color: '#0d8f77', fontSize: '0.85rem' }}>{savedMsg}</span>}
      </div>

      <div className="card">
        <h3>Skills</h3>
        <div style={{ marginBottom: '0.75rem' }}>
          {profile.skills.length === 0 && <span className="empty-state" style={{ padding: 0 }}>No skills added yet.</span>}
          {profile.skills.map((s) => (
            <span className="skill-tag have" key={s.name}>
              {s.name}{' '}
              <button
                onClick={() => removeSkill(s.name)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0d8f77' }}
                aria-label={`Remove ${s.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={addSkill} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            placeholder="e.g. React"
            value={skillName}
            onChange={(e) => setSkillName(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <button className="secondary" type="submit">Add skill</button>
        </form>
      </div>

      <div className="card">
        <h3>Past projects</h3>
        {profile.projects.length === 0 && <p className="empty-state" style={{ padding: 0, textAlign: 'left' }}>No projects added yet.</p>}
        {profile.projects.map((p) => (
          <div key={p.name} style={{ marginBottom: '0.75rem' }}>
            <strong>{p.name}</strong> <span style={{ color: '#8b96a8', fontSize: '0.85rem' }}>({p.techStack})</span>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem' }}>{p.description}</p>
          </div>
        ))}
        <form onSubmit={addProject}>
          <input
            placeholder="Project name"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
          />
          <input
            placeholder="Tech stack (e.g. React, Node.js)"
            value={projectForm.techStack}
            onChange={(e) => setProjectForm({ ...projectForm, techStack: e.target.value })}
          />
          <textarea
            rows={2}
            placeholder="Short description"
            value={projectForm.description}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
          />
          <button className="secondary" type="submit">Add project</button>
        </form>
      </div>

      <div className="card">
        <h3>Experience</h3>
        {profile.experience.length === 0 && <p className="empty-state" style={{ padding: 0, textAlign: 'left' }}>No experience added yet.</p>}
        {profile.experience.map((e) => (
          <div key={e.company} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <strong>{e.role}</strong> — {e.company} ({e.years} yrs)
          </div>
        ))}
        <form onSubmit={addExperience} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            placeholder="Company"
            value={expForm.company}
            onChange={(e) => setExpForm({ ...expForm, company: e.target.value })}
            style={{ flex: 2, marginBottom: 0 }}
          />
          <input
            placeholder="Role"
            value={expForm.role}
            onChange={(e) => setExpForm({ ...expForm, role: e.target.value })}
            style={{ flex: 2, marginBottom: 0 }}
          />
          <input
            placeholder="Years"
            type="number"
            value={expForm.years}
            onChange={(e) => setExpForm({ ...expForm, years: e.target.value })}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <button className="secondary" type="submit">Add</button>
        </form>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
