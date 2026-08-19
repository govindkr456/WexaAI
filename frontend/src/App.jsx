import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import JobMatches from './pages/JobMatches';
import SkillGapAnalysis from './pages/SkillGapAnalysis';
import CompanyExplorer from './pages/CompanyExplorer';
import ChatbotWidget from './components/ChatbotWidget';

function ProtectedLayout({ children }) {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="node-dot" /> Skill/Job Graph
        </div>
        <nav>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : '')}>
            Profile
          </NavLink>
          <NavLink to="/matches" className={({ isActive }) => (isActive ? 'active' : '')}>
            Job Matches
          </NavLink>
          <NavLink to="/skill-gap" className={({ isActive }) => (isActive ? 'active' : '')}>
            Skill Gap Analysis
          </NavLink>
          <NavLink to="/companies" className={({ isActive }) => (isActive ? 'active' : '')}>
            Company Explorer
          </NavLink>
        </nav>
        <div className="user-row">
          Signed in as {user.name}
          <br />
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
      <ChatbotWidget />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<ProtectedLayout><Profile /></ProtectedLayout>} />
      <Route path="/matches" element={<ProtectedLayout><JobMatches /></ProtectedLayout>} />
      <Route path="/skill-gap" element={<ProtectedLayout><SkillGapAnalysis /></ProtectedLayout>} />
      <Route path="/companies" element={<ProtectedLayout><CompanyExplorer /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/profile" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
