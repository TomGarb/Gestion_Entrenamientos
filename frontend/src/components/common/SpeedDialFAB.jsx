import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SpeedDialFAB = ({
  isOpen,
  onToggle,
  onClose,
  onOpenFoodModal,
  onOpenWeightModal,
  isAdmin = false,
}) => {
  const navigate = useNavigate();

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAction = (actionFn) => {
    onClose();
    actionFn();
  };

  const actions = [
    {
      id: 'workout',
      label: 'Entrenamiento Libre',
      icon: '⚡',
      onClick: () => handleAction(() => navigate('/workout')),
      delay: '0.03s',
    },
    {
      id: 'food',
      label: 'Registrar Comida',
      icon: '🍎',
      onClick: () => handleAction(onOpenFoodModal),
      delay: '0.06s',
    },
    {
      id: 'weight',
      label: 'Actualizar Peso',
      icon: '⚖️',
      onClick: () => handleAction(onOpenWeightModal),
      delay: '0.09s',
    },
    {
      id: 'exercise',
      label: 'Añadir Ejercicio',
      icon: '🏋️',
      onClick: () => handleAction(() => navigate('/exercises?new=1')),
      delay: '0.12s',
    },
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: 'Panel de Admin',
            icon: '🛡️',
            onClick: () => handleAction(() => navigate('/admin')),
            delay: '0.15s',
          },
        ]
      : []),
  ];

  return (
    <>
      <style>{`
        /* Backdrop con blur */
        .speed-dial-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.48);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .speed-dial-backdrop.active {
          opacity: 1;
          pointer-events: auto;
        }

        /* Menú Speed Dial Desktop */
        .speed-dial-desktop-container {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 1001;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .speed-dial-desktop-container {
            display: none !important;
          }
        }

        .speed-dial-btn-main {
          pointer-events: auto;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #34C759 0%, #10B981 100%);
          color: #000000;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(52, 199, 89, 0.45), 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
          outline: none;
          position: relative;
          z-index: 1002;
        }

        .speed-dial-btn-main:hover {
          transform: scale(1.06);
          box-shadow: 0 10px 28px rgba(52, 199, 89, 0.6);
        }

        .speed-dial-btn-main:active {
          transform: scale(0.96);
        }

        .speed-dial-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .speed-dial-icon.rotated {
          transform: rotate(45deg);
        }

        /* Menú Desktop (alineado a la derecha sobre el FAB) */
        .speed-dial-menu-desktop {
          position: absolute;
          bottom: 68px;
          right: 0;
          display: flex;
          flex-direction: column-reverse;
          gap: 0.75rem;
          align-items: flex-end;
          pointer-events: none;
        }

        /* Menú Móvil (centrado directamente sobre el botón central del dock) */
        .speed-dial-menu-mobile {
          position: fixed;
          bottom: 5.25rem;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column-reverse;
          gap: 0.7rem;
          align-items: center;
          pointer-events: none;
          z-index: 1002;
          width: max-content;
        }

        @media (min-width: 769px) {
          .speed-dial-menu-mobile {
            display: none !important;
          }
        }

        /* Estilo de los Ítems del Menú */
        .speed-dial-item {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          background: var(--bg-card, #1c1c1e);
          color: var(--text-primary, #ffffff);
          border: 1px solid var(--border-line, rgba(255, 255, 255, 0.12));
          border-radius: 9999px;
          padding: 0.6rem 1.15rem 0.6rem 0.95rem;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: translateY(18px) scale(0.85);
          opacity: 0;
          visibility: hidden;
          white-space: nowrap;
          user-select: none;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .speed-dial-item.open {
          transform: translateY(0) scale(1);
          opacity: 1;
          visibility: visible;
        }

        .speed-dial-item:hover, .speed-dial-item:active {
          border-color: var(--accent, #34c759);
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 12px 28px rgba(52, 199, 89, 0.3);
          color: #ffffff;
        }

        .speed-dial-item-icon {
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .speed-dial-item-label {
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: -0.2px;
        }
      `}</style>

      {/* Backdrop oscuro con blur */}
      <div
        className={`speed-dial-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Menú Móvil (desplegado desde el centro del Dock) */}
      <div className="speed-dial-menu-mobile" aria-hidden={!isOpen}>
        {actions.map((act) => (
          <button
            key={`mob-${act.id}`}
            type="button"
            className={`speed-dial-item ${isOpen ? 'open' : ''}`}
            onClick={act.onClick}
            style={{
              transitionDelay: isOpen ? act.delay : '0s',
            }}
            tabIndex={isOpen ? 0 : -1}
          >
            <span className="speed-dial-item-icon">{act.icon}</span>
            <span className="speed-dial-item-label">{act.label}</span>
          </button>
        ))}
      </div>

      {/* Menú y FAB flotante para Escritorio */}
      <div className="speed-dial-desktop-container">
        <div className="speed-dial-menu-desktop" aria-hidden={!isOpen}>
          {actions.map((act) => (
            <button
              key={`desk-${act.id}`}
              type="button"
              className={`speed-dial-item ${isOpen ? 'open' : ''}`}
              onClick={act.onClick}
              style={{
                transitionDelay: isOpen ? act.delay : '0s',
              }}
              tabIndex={isOpen ? 0 : -1}
            >
              <span className="speed-dial-item-icon">{act.icon}</span>
              <span className="speed-dial-item-label">{act.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="speed-dial-btn-main"
          onClick={onToggle}
          aria-label={isOpen ? 'Cerrar menú rápido' : 'Abrir menú rápido'}
          aria-expanded={isOpen}
          title={isOpen ? 'Cerrar' : 'Acciones rápidas'}
        >
          <div className={`speed-dial-icon ${isOpen ? 'rotated' : ''}`}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#000000"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </button>
      </div>
    </>
  );
};

export default SpeedDialFAB;
