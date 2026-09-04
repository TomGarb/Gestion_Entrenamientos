import React, { useContext, useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { NotificationContext } from '../../context/NotificationContext';
import FeedbackModal from './FeedbackModal';
import NotificationDropdown from './NotificationDropdown';
import {
  BellIcon,
  LightbulbIcon,
  SunIcon,
  MoonIcon,
  ShieldIcon,
  UserIcon,
  LogOutIcon,
  HomeIcon,
  DumbbellIcon,
  RoutineIcon,
  CalendarIcon,
  UsersIcon,
  PlayIcon
} from './Icons';

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useContext(AuthContext);
  const { unreadCount } = useContext(NotificationContext);
  
  const [showFeedback, setShowFeedback] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== null ? saved === 'dark' : true;
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
  const isActive = (path) => location.pathname === path;

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* 🖥️ Top Nav (Solo Escritorio) */}
      <nav className="desktop-nav" style={{ 
          display: 'flex', justifyContent: 'space-between', padding: '0.9rem 2.5rem', 
          backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', 
          alignItems: 'center', position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid var(--border-line)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}>
        {/* Top-Left: Logo, Avatar del usuario y acceso a Ajustes */}
        <div style={{ fontWeight: '700', fontSize: '1.2rem', letterSpacing: '-0.5px' }}>
          <Link 
            to="/settings" 
            style={{ 
              color: 'var(--text-primary)', 
              textDecoration: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              padding: '4px 8px',
              borderRadius: '12px',
              transition: 'all 0.2s ease'
            }}
            className="nav-link-item"
            title="Ajustes y Perfil de Usuario"
          >
            <div style={{ 
              width: '34px', 
              height: '34px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              background: 'var(--bg-card)', 
              border: '2px solid var(--accent)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user?.username || 'Perfil'} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <UserIcon size={18} color="var(--accent)" />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.3px', lineHeight: '1.2' }}>
                {user?.username ? user.username : 'GymTracker'}
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Ajustes y Perfil
              </span>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontWeight: '500', fontSize: '0.9rem' }}>
          
          {/* Campanita de Notificaciones */}
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            className="nav-icon-btn"
            style={{ position: 'relative' }}
            title="Notificaciones"
          >
            <BellIcon size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
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
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(255, 59, 48, 0.4)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Feedback */}
          <button 
            onClick={() => setShowFeedback(true)} 
            className="nav-icon-btn"
            title="Reportar un problema o sugerencia"
          >
            <LightbulbIcon size={20} />
          </button>

          {/* Cambio de Tema */}
          <button 
            onClick={toggleTheme} 
            className="nav-icon-btn"
            title="Cambiar tema (Claro / Oscuro)"
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-line)', margin: '0 0.5rem' }} />

          <Link to="/" className={`nav-link-item ${isActive('/') ? 'active' : ''}`}>Dashboard</Link>
          <Link to="/exercises" className={`nav-link-item ${isActive('/exercises') ? 'active' : ''}`}>Ejercicios</Link>
          <Link to="/routines" className={`nav-link-item ${isActive('/routines') ? 'active' : ''}`}>Rutinas</Link>
          <Link to="/calendar" className={`nav-link-item ${isActive('/calendar') ? 'active' : ''}`}>Calendario</Link>
          <Link to="/community" className={`nav-link-item ${isActive('/community') ? 'active' : ''}`}>Comunidad</Link>
          
          {user?.is_admin && (
            <Link to="/admin" className={`nav-link-item ${isActive('/admin') ? 'active' : ''}`} style={{ color: isActive('/admin') ? 'var(--accent)' : 'var(--text-secondary)' }}>
              <ShieldIcon size={16} color="currentColor" /> Admin
            </Link>
          )}

          <Link to="/workout" style={{ 
            color: '#000000', 
            background: 'var(--accent)', 
            padding: '0.45rem 1rem', 
            borderRadius: '10px', 
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 10px rgba(52, 199, 89, 0.3)',
            marginLeft: '0.5rem'
          }}>
            <PlayIcon size={15} color="#000000" />
            Entrenar
          </Link>

          <button 
            onClick={handleLogout} 
            className="nav-icon-btn"
            style={{ marginLeft: '0.25rem', gap: '4px', fontSize: '0.85rem' }}
            title="Cerrar Sesión"
          >
            <LogOutIcon size={18} />
            <span>Salir</span>
          </button>
        </div>
      </nav>

      {/* 📱 Top Header Minimal (Solo Móvil) */}
      <header className="mobile-nav" style={{ 
          display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1.25rem', 
          backgroundColor: 'var(--bg-primary)', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100,
          borderBottom: '1px solid var(--border-line)'
        }}>
        {/* Top-Left Móvil: Avatar con foto y nombre hacia Ajustes */}
        <Link 
          to="/settings" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            textDecoration: 'none',
            color: 'inherit'
          }}
          title="Ir a Configuración / Perfil"
        >
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            overflow: 'hidden',
            background: 'var(--bg-card)', 
            border: '2px solid var(--accent)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user?.username || 'Perfil'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <UserIcon size={18} color="var(--accent)" />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              {user?.username ? user.username : 'GymTracker'}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Ajustes y Perfil
            </span>
          </div>
        </Link>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {/* Campanita Mobile */}
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            className="nav-icon-btn"
            style={{ position: 'relative' }}
            title="Notificaciones"
          >
            <BellIcon size={20} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                background: 'var(--danger-gradient, #FF3B30)',
                color: '#FFFFFF',
                borderRadius: '50%',
                minWidth: '15px',
                height: '15px',
                padding: '0 3px',
                fontSize: '0.6rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setShowFeedback(true)} 
            className="nav-icon-btn"
            title="Reportar feedback"
          >
            <LightbulbIcon size={20} />
          </button>

          <button 
            onClick={toggleTheme} 
            className="nav-icon-btn"
            title="Cambiar tema"
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </button>

          <button 
            onClick={handleLogout} 
            className="nav-icon-btn"
            title="Cerrar sesión"
          >
            <LogOutIcon size={20} />
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

      {/* 🚀 📱 Bottom Navigation (Solo Móvil - Propuesta C: Floating Island Dock sin saturación) */}
      <div className="mobile-nav floating-dock-container">
        <nav className="floating-dock">
          
          <Link to="/" className={`dock-item ${isActive('/') ? 'active' : ''}`} title="Inicio">
            <HomeIcon size={20} color={isActive('/') ? 'var(--accent)' : 'currentColor'} />
            <span className="dock-label">Inicio</span>
          </Link>

          <Link to="/exercises" className={`dock-item ${isActive('/exercises') ? 'active' : ''}`} title="Ejercicios">
            <DumbbellIcon size={20} color={isActive('/exercises') ? 'var(--accent)' : 'currentColor'} />
            <span className="dock-label">Ejercicios</span>
          </Link>

          <Link to="/workout" className="dock-cta-btn" title="Entrenar">
            <PlayIcon size={20} color="#000000" />
          </Link>

          <Link to="/routines" className={`dock-item ${isActive('/routines') ? 'active' : ''}`} title="Rutinas">
            <RoutineIcon size={20} color={isActive('/routines') ? 'var(--accent)' : 'currentColor'} />
            <span className="dock-label">Rutinas</span>
          </Link>

          <Link to="/calendar" className={`dock-item ${isActive('/calendar') ? 'active' : ''}`} title="Calendario">
            <CalendarIcon size={20} color={isActive('/calendar') ? 'var(--accent)' : 'currentColor'} />
            <span className="dock-label">Calendario</span>
          </Link>

          <Link to="/community" className={`dock-item ${isActive('/community') ? 'active' : ''}`} title="Comunidad">
            <UsersIcon size={20} color={isActive('/community') ? 'var(--accent)' : 'currentColor'} />
            <span className="dock-label">Comunidad</span>
          </Link>

          {user?.is_admin && (
            <Link to="/admin" className={`dock-item ${isActive('/admin') ? 'active' : ''}`} title="Admin">
              <ShieldIcon size={20} color={isActive('/admin') ? 'var(--accent)' : 'currentColor'} />
              <span className="dock-label">Admin</span>
            </Link>
          )}

        </nav>
      </div>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
};

export default MainLayout;
