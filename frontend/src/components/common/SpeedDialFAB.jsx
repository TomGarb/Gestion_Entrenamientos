import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SpeedDialFAB = ({ onOpenFoodModal, onOpenWeightModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Cerrar al presionar la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleAction = (actionFn) => {
    setIsOpen(false);
    actionFn();
  };

  const actions = [
    {
      id: 'food',
      label: 'Registrar Comida',
      icon: '🍎',
      onClick: () => handleAction(onOpenFoodModal),
      delay: '0.04s',
    },
    {
      id: 'workout',
      label: 'Entrenamiento Libre',
      icon: '⚡',
      onClick: () => handleAction(() => navigate('/workout')),
      delay: '0.08s',
    },
    {
      id: 'weight',
      label: 'Actualizar Peso',
      icon: '⚖️',
      onClick: () => handleAction(onOpenWeightModal),
      delay: '0.12s',
    },
  ];

  return (
    <>
      <style>{`
        .speed-dial-container {
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
          .speed-dial-container {
            bottom: 5.5rem;
            right: 1.25rem;
          }
        }

        .speed-dial-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
          z-index: 1000;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .speed-dial-backdrop.active {
          opacity: 1;
          pointer-events: auto;
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

        .speed-dial-menu {
          position: absolute;
          bottom: 68px;
          right: 0;
          display: flex;
          flex-direction: column-reverse;
          gap: 0.75rem;
          align-items: flex-end;
          pointer-events: none;
        }

        .speed-dial-item {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: var(--bg-card, #1c1c1e);
          color: var(--text-primary, #ffffff);
          border: 1px solid var(--border-line, rgba(255, 255, 255, 0.12));
          border-radius: 9999px;
          padding: 0.55rem 1rem 0.55rem 0.85rem;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform: translateY(16px) scale(0.85);
          opacity: 0;
          visibility: hidden;
          white-space: nowrap;
          user-select: none;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .speed-dial-item.open {
          transform: translateY(0) scale(1);
          opacity: 1;
          visibility: visible;
        }

        .speed-dial-item:hover {
          border-color: var(--accent, #34c759);
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 10px 24px rgba(52, 199, 89, 0.25);
        }

        .speed-dial-item-icon {
          font-size: 1.15rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .speed-dial-item-label {
          font-size: 0.88rem;
          font-weight: 600;
          letter-spacing: -0.2px;
        }
      `}</style>

      {/* Backdrop oscuro con blur ligero */}
      <div
        className={`speed-dial-backdrop ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      {/* Contenedor del FAB */}
      <div className="speed-dial-container">
        {/* Menú ascendente de opciones */}
        <div className="speed-dial-menu" aria-hidden={!isOpen}>
          {actions.map((act) => (
            <button
              key={act.id}
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

        {/* Botón Principal (FAB) */}
        <button
          type="button"
          className="speed-dial-btn-main"
          onClick={toggleOpen}
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
