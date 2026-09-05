import React, { useContext, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import FeedbackModal from './FeedbackModal';
import NotificationDropdown from './NotificationDropdown';
import InitialSetupModal from './InitialSetupModal';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);
  
  const [showFeedback, setShowFeedback] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Siempre forzamos el tema oscuro por defecto para esta estetica
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== null ? saved === 'dark' : true; // Default dark
  });

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

  // Helper para saber si un tab esta activo
  const isActive = (path) => location.pathname === path;
  
  // Iconos SVG en linea simples y elegantes (estilo Heroicons / Feather)
  const IconHome = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  );

  const IconDumbbell = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h3M3 10h3M18 14h3M3 14h3M8 6h8M8 18h8M6 8v8M18 8v8M10 6v12M14 6v12"></path>
    </svg>
  );

  const IconList = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );

  const IconPlay = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'var(--accent)' : 'none'} stroke={active ? 'var(--accent)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="10 8 16 12 10 16 10 8"></polygon>
    </svg>
  );

  const IconUsers = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );

  const IconCalendar = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );

  const IconSettings = ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--text-primary)' : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* 🖥️ Top Nav (Solo Escritorio) */}
      <nav className="desktop-nav" style={{ 
          display: 'flex', justifyContent: 'space-between', padding: '1rem 3rem', 
          backgroundColor: 'transparent', color: 'var(--text-primary)', 
          alignItems: 'center', position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid var(--border-line)'
        }}>
        <div style={{ fontWeight: '700', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
          <Link to="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--text-primary)', borderRadius: '50%', width: '24px', height: '24px' }}></div>
            GymTracker
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontWeight: '500', fontSize: '0.9rem' }}>
          
          {/* Campanita de Notificaciones */}
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px'
            }}
            title="Notificaciones"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '0px',
                right: '-2px',
                background: 'var(--danger-gradient, #FF3B30)',
                color: '#FFFFFF',
                borderRadius: '50%',
                minWidth: '18px',
                height: '18px',
                padding: '0 4px',
                fontSize: '0.7rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => setShowFeedback(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }} title="Reportar un problema">
            💡
          </button>
          <button onClick={toggleTheme} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-line)', color: 'var(--text-primary)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }} title="Cambiar tema">
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link to="/" style={{ color: isActive('/') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Dashboard</Link>
          <Link to="/exercises" style={{ color: isActive('/exercises') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Ejercicios</Link>
          <Link to="/routines" style={{ color: isActive('/routines') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Rutinas</Link>
          <Link to="/calendar" style={{ color: isActive('/calendar') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Calendario</Link>
          <Link to="/community" style={{ color: isActive('/community') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Comunidad</Link>
          <Link to="/settings" style={{ color: isActive('/settings') ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Config</Link>
          {user?.is_admin && (
            <Link to="/admin" style={{ color: isActive('/admin') ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: 'bold' }}>🛡️ Admin</Link>
          )}
          <Link to="/workout" style={{ color: '#000', background: 'var(--text-primary)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '600' }}>Entrenar</Link>
          <button 
            onClick={handleLogout} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '500', fontSize: '0.9rem' }}>
            Salir
          </button>
        </div>
      </nav>

      {/* 📱 Top Header Minimal (Solo Móvil) */}
      <header className="mobile-nav" style={{ 
          display: 'flex', justifyContent: 'space-between', padding: '1rem', 
          backgroundColor: 'var(--bg-primary)', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <span style={{ fontSize: '1rem' }}>👤</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-primary)' }}>GymTracker</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Analytics & Tracking</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {/* Campanita Mobile */}
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                background: 'var(--danger-gradient, #FF3B30)',
                color: '#FFFFFF',
                borderRadius: '50%',
                minWidth: '16px',
                height: '16px',
                padding: '0 3px',
                fontSize: '0.65rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => setShowFeedback(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
            💡
          </button>
          <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>

      {/* Dropdown de Notificaciones */}
      {showNotifications && (
        <NotificationDropdown onClose={() => setShowNotifications(false)} />
      )}


      {/* 📱 Bottom Navigation (Solo Móvil) */}
      <nav className="mobile-nav" style={{ 
          display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0.75rem 0.5rem 2rem 0.5rem', 
          backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-line)',
          position: 'fixed', bottom: 0, width: '100%', zIndex: 100
        }}>
        <Link to="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <IconHome active={isActive('/')} />
        </Link>
        <Link to="/exercises" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <IconDumbbell active={isActive('/exercises')} />
        </Link>
        <Link to="/workout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transform: 'translateY(-10px)' }}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: '50%', padding: '4px', border: '1px solid var(--border-line)' }}>
            <IconPlay active={isActive('/workout')} />
          </div>
        </Link>
        <Link to="/routines" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <IconList active={isActive('/routines')} />
        </Link>
        <Link to="/calendar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <IconCalendar active={isActive('/calendar')} />
        </Link>
        <Link to="/community" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <IconUsers active={isActive('/community')} />
        </Link>
        {user?.is_admin && (
          <Link to="/admin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '20px', opacity: isActive('/admin') ? 1 : 0.5, filter: isActive('/admin') ? 'none' : 'grayscale(100%)' }}>🛡️</span>
          </Link>
        )}
        <Link to="/settings" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <IconSettings active={isActive('/settings')} />
        </Link>
      </nav>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      <InitialSetupModal />
    </div>
  );
};

export default MainLayout;
