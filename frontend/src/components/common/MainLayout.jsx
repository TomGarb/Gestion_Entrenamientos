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
      <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#1e1e1e', color: 'white' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>🏋️ GymTracker</Link>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#4da3ff', textDecoration: 'none' }}>Dashboard</Link>
          <Link to="/exercises" style={{ color: '#4da3ff', textDecoration: 'none' }}>Ejercicios</Link>
          <Link to="/routines" style={{ color: '#4da3ff', textDecoration: 'none' }}>Rutinas</Link>
          <Link to="/workout" style={{ color: '#20BF55', textDecoration: 'none', fontWeight: 'bold' }}>💪 Entrenar</Link>
          <Link to="/settings" style={{ color: '#4da3ff', textDecoration: 'none' }}>Configuración</Link>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}>
            Cerrar Sesión
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
