import React, { useContext, useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationContext } from '../../context/NotificationContext';
import { acceptWorkoutInvitation, rejectWorkoutInvitation } from '../../services/scheduledWorkoutService';
import { BellIcon, DumbbellIcon, UsersIcon, CalendarIcon } from './Icons';

const NotificationDropdown = ({ onClose }) => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useContext(NotificationContext);
  const dropdownRef = useRef(null);
  const [actionLoading, setActionLoading] = useState({});
  const [actionStatus, setActionStatus] = useState({});

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAction = (notif) => {
    if (!notif.is_read) {
      markAsRead(notif.id);
    }
    if (notif.type === 'friend_request' || notif.type === 'friend_accepted' || notif.type === 'friend_rejected') {
      navigate('/community');
      onClose();
    } else if (notif.type.startsWith('workout_invitation')) {
      navigate('/calendar');
      onClose();
    }
  };

  const handleAcceptWorkout = async (e, notif) => {
    e.stopPropagation();
    if (!notif.reference_id) return;
    setActionLoading(prev => ({ ...prev, [notif.id]: true }));
    try {
      await acceptWorkoutInvitation(notif.reference_id);
      setActionStatus(prev => ({ ...prev, [notif.id]: 'accepted' }));
      markAsRead(notif.id);
      fetchNotifications();
    } catch (err) {
      console.error('Error aceptando entrenamiento:', err);
      alert(err.response?.data?.detail || 'Error al aceptar la invitación');
    } finally {
      setActionLoading(prev => ({ ...prev, [notif.id]: false }));
    }
  };

  const handleRejectWorkout = async (e, notif) => {
    e.stopPropagation();
    if (!notif.reference_id) return;
    setActionLoading(prev => ({ ...prev, [notif.id]: true }));
    try {
      await rejectWorkoutInvitation(notif.reference_id);
      setActionStatus(prev => ({ ...prev, [notif.id]: 'rejected' }));
      markAsRead(notif.id);
      fetchNotifications();
    } catch (err) {
      console.error('Error rechazando entrenamiento:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [notif.id]: false }));
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'workout_invitation':
        return <DumbbellIcon size={18} color="var(--accent)" />;
      case 'workout_invitation_accepted':
        return <CalendarIcon size={18} color="var(--accent)" />;
      case 'workout_invitation_rejected':
        return <CalendarIcon size={18} color="var(--text-secondary)" />;
      case 'friend_request':
        return <UsersIcon size={18} color="var(--accent)" />;
      case 'friend_accepted':
        return <UsersIcon size={18} color="var(--accent)" />;
      case 'friend_rejected':
        return <UsersIcon size={18} color="var(--text-secondary)" />;
      default:
        return <BellIcon size={18} color="var(--text-secondary)" />;
    }
  };

  return (
    <>
      {/* Fondo oscuro para capturar toques y evitar scroll de fondo en móviles */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 999,
          animation: 'fadeIn 0.15s ease-in-out'
        }}
      />

      <div
        ref={dropdownRef}
        className="glass-panel"
        style={{
          position: 'fixed',
          top: '60px',
          right: '16px',
          width: '380px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 130px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-line)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55)',
          zIndex: 1000,
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-in-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-line)',
            background: 'rgba(255, 255, 255, 0.02)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  background: 'var(--danger-gradient, #FF3B30)',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent, #34C759)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  padding: '4px 6px'
                }}
              >
                Leídas todas
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar notificaciones"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '1rem',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--accent)' }}>
              <BellIcon size={36} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Estás al día
            </div>
            <div style={{ fontSize: '0.85rem' }}>No tienes notificaciones pendientes.</div>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleAction(notif)}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                marginBottom: '4px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                background: notif.is_read ? 'transparent' : 'rgba(52, 199, 89, 0.06)',
                border: notif.is_read ? '1px solid transparent' : '1px solid rgba(52, 199, 89, 0.15)',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-input)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = notif.is_read
                  ? 'transparent'
                  : 'rgba(52, 199, 89, 0.06)';
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  flexShrink: 0
                }}
              >
                {getIcon(notif.type)}
              </div>

              {/* Text */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '2px'
                  }}
                >
                  <span
                    style={{
                      fontWeight: notif.is_read ? '600' : '700',
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {notif.title}
                  </span>
                  {!notif.is_read && (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--accent, #34C759)',
                        flexShrink: 0
                      }}
                    />
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.3',
                    marginBottom: '6px'
                  }}
                >
                  {notif.message}
                </div>

                {/* Acciones interactivas para Invitaciones a Entrenar */}
                {notif.type === 'workout_invitation' && (
                  <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                    {actionStatus[notif.id] === 'accepted' ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent, #34C759)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Invitación aceptada e incorporada
                      </span>
                    ) : actionStatus[notif.id] === 'rejected' ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        ✕ Invitación rechazada
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          disabled={actionLoading[notif.id]}
                          onClick={(e) => handleAcceptWorkout(e, notif)}
                          style={{
                            background: 'var(--accent, #34C759)',
                            color: '#000000',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(52, 199, 89, 0.2)'
                          }}
                        >
                          {actionLoading[notif.id] ? 'Aceptando...' : '✓ Aceptar'}
                        </button>
                        <button
                          disabled={actionLoading[notif.id]}
                          onClick={(e) => handleRejectWorkout(e, notif)}
                          style={{
                            background: 'var(--bg-input)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-line)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          {actionLoading[notif.id] ? '...' : '✕ Rechazar'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <span>{formatTime(notif.created_at)}</span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    title="Eliminar notificación"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '2px 6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--danger, #FF3B30)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown;

