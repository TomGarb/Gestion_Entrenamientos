import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * FloatingBottomNav
 * Barra de navegación móvil flotante estilo PWA (Island Dock).
 * Incorpora efecto Glassmorphism (backdrop-blur), esquinas redondeadas completas,
 * e iluminación Neón Glow sobre el ícono activo.
 */
const FloatingBottomNav = ({ items = [] }) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  // Items por defecto si no se pasan por props
  const defaultItems = [
    {
      path: '/',
      label: 'Inicio',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent-electric)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      path: '/exercises',
      label: 'Ejercicios',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent-electric)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6.5 6.5 11 11"/>
          <path d="m21 21-1-1"/>
          <path d="m3 3 1 1"/>
          <path d="m18 22 4-4"/>
          <path d="m2 6 4-4"/>
          <path d="m3 10 7-7"/>
          <path d="m14 21 7-7"/>
        </svg>
      ),
    },
    {
      path: '/workout',
      label: 'Entrenar',
      isCTA: true,
      icon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      ),
    },
    {
      path: '/routines',
      label: 'Rutinas',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent-electric)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
      ),
    },
    {
      path: '/calendar',
      label: 'Progreso',
      icon: (active) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--accent-electric)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
          <line x1="16" x2="16" y1="2" y2="6"/>
          <line x1="8" x2="8" y1="2" y2="6"/>
          <line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
      ),
    },
  ];

  const navItems = items.length > 0 ? items : defaultItems;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        padding: '0 1rem',
        pointerEvents: 'none',
      }}
    >
      <nav
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.4rem',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'var(--dock-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid var(--dock-border)',
          borderRadius: '9999px',
          boxShadow: 'var(--dock-shadow)',
          maxWidth: '440px',
          width: '100%',
        }}
      >
        {navItems.map((item, idx) => {
          const active = isActive(item.path);

          // Botón central elevado de acción (CTA)
          if (item.isCTA) {
            return (
              <Link
                key={idx}
                to={item.path}
                title={item.label}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-crimson) 0%, #E11D48 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 18px rgba(255, 42, 85, 0.45)',
                  transform: 'translateY(-4px)',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {item.icon(active)}
              </Link>
            );
          }

          return (
            <Link
              key={idx}
              to={item.path}
              title={item.label}
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                textDecoration: 'none',
                color: active ? 'var(--accent-electric)' : 'var(--text-secondary)',
                padding: '8px 12px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: '700',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: active ? 'var(--accent-electric-bg)' : 'transparent',
                boxShadow: active ? '0 0 16px rgba(0, 212, 255, 0.25)' : 'none',
              }}
            >
              <div
                style={{
                  filter: active ? 'drop-shadow(0 0 6px var(--accent-electric))' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon(active)}
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  display: active ? 'block' : 'none',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default FloatingBottomNav;
