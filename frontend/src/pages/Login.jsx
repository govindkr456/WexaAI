import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate('/profile');
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Welcome back</h1>
        <p style={{ color: '#8b96a8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Log in to see your job matches
        </p>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error-text">{error}</p>}
        <button className="primary" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        <p style={{ fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
