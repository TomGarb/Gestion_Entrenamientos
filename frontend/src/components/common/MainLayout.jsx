import React, { useContext, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const MainLayout = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);
  
  // Theme state
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <div style={{ fontFamily: 'Poppins, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 3rem', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', color: 'var(--text-primary)', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, transition: 'background-color 0.3s' }}>
        <div style={{ fontWeight: '800', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
          <Link to="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: 'var(--mint-gradient)', borderRadius: '50%', width: '32px', height: '32px', display: 'inline-block' }}></span>
            GymTracker
          </Link>
        </div>
        <div className="nav-links" style={{ display: 'flex', gap: '2rem', alignItems: 'center', fontWeight: '600', fontSize: '1rem' }}>
          <button onClick={toggleTheme} style={{ background: 'var(--bg-input)', border: 'none', color: 'var(--text-primary)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }} title="Cambiar tema">
            {isDark ? '🌙' : '☀️'}
          </button>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/exercises" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Ejercicios</Link>
          <Link to="/routines" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Rutinas</Link>
          <Link to="/workout" style={{ color: '#FFFFFF', background: 'var(--mint-gradient)', padding: '0.6rem 1.5rem', borderRadius: '9999px', textDecoration: 'none', boxShadow: '0 10px 20px rgba(74, 222, 128, 0.2)' }}>Entrenar</Link>
          <Link to="/settings" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Config</Link>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', border: 'none', color: 'var(--peach-text)', cursor: 'pointer', fontWeight: '600', fontSize: '1rem' }}>
            Salir
          </button>
        </div>
      </nav>
      <main style={{ padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
