import React, { useContext } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const MainLayout = () => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 2rem', backgroundColor: '#1C1C1E', borderBottom: '2px solid #3A3A3C', color: '#F2F2F7' }}>
        <div style={{ fontWeight: '900', fontSize: '1.4rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
          <Link to="/" style={{ color: '#FFD60A', textDecoration: 'none' }}>GYMTRACKER</Link>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>
          <Link to="/" style={{ color: '#AEAEB2', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/exercises" style={{ color: '#AEAEB2', textDecoration: 'none' }}>Ejercicios</Link>
          <Link to="/routines" style={{ color: '#AEAEB2', textDecoration: 'none' }}>Rutinas</Link>
          <Link to="/workout" style={{ color: '#1C1C1E', backgroundColor: '#FFD60A', padding: '0.4rem 0.8rem', borderRadius: '4px', textDecoration: 'none' }}>ENTRENAR</Link>
          <Link to="/settings" style={{ color: '#AEAEB2', textDecoration: 'none' }}>Config</Link>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', border: 'none', color: '#FF453A', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Salir
          </button>
        </div>
      </nav>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
