import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarPage.css';

import { AuthContext } from '../context/AuthContext';
import {
  getMyCalendar,
  getFriendCalendar,
  createScheduledWorkout,
  updateScheduledWorkout,
  deleteScheduledWorkout
} from '../services/calendarService';
import { getFriends } from '../services/communityService';
import api from '../services/api';

const CalendarPage = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected date and calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Friend mode
  const friendIdParam = searchParams.get('friendId');
  const [friends, setFriends] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState(friendIdParam ? parseInt(friendIdParam, 10) : null);

  // User routines (for scheduling)
  const [routines, setRoutines] = useState([]);

  // Modal Planificar
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({
    scheduled_date: new Date().toISOString().split('T')[0],
    routine_id: '',
    title: '',
    notes: ''
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Format date helper: YYYY-MM-DD
  const formatDateKey = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Sync URL search params with selectedFriendId
  useEffect(() => {
    if (friendIdParam) {
      setSelectedFriendId(parseInt(friendIdParam, 10));
    }
  }, [friendIdParam]);

  // Cargar lista de amigos y rutinas del usuario
  useEffect(() => {
    const fetchAuxData = async () => {
      try {
        const [friendsRes, routinesRes] = await Promise.all([
          getFriends().catch(() => []),
          api.get('/api/routines').catch(() => ({ data: [] }))
        ]);
        setFriends(Array.isArray(friendsRes) ? friendsRes : (friendsRes?.friends || []));
        setRoutines(Array.isArray(routinesRes.data) ? routinesRes.data : (Array.isArray(routinesRes) ? routinesRes : []));
      } catch (err) {
        console.error('Error fetching aux calendar data:', err);
      }
    };
    fetchAuxData();
  }, []);

  // Cargar datos del calendario (mío o de un amigo)
  const fetchCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      if (selectedFriendId) {
        const data = await getFriendCalendar(selectedFriendId);
        setCalendarData(data);
      } else {
        const data = await getMyCalendar();
        setCalendarData(data);
      }
    } catch (err) {
      console.error('Error loading calendar:', err);
      setError(err.response?.data?.detail || 'Error al cargar eventos del calendario.');
      setCalendarData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [selectedFriendId]);

  // Manejador de cambio de amigo en selector
  const handleFriendChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setSelectedFriendId(null);
      setSearchParams({});
    } else {
      const fid = parseInt(val, 10);
      setSelectedFriendId(fid);
      setSearchParams({ friendId: fid });
    }
  };

  // Abrir modal de creación para el día seleccionado
  const handleOpenScheduleModal = (dateObj = selectedDate) => {
    setEditingSchedule(null);
    setScheduleFormData({
      scheduled_date: formatDateKey(dateObj),
      routine_id: routines.length > 0 ? routines[0].id : '',
      title: '',
      notes: ''
    });
    setShowScheduleModal(true);
  };

  // Abrir modal de edición
  const handleOpenEditSchedule = (event) => {
    setEditingSchedule(event);
    setScheduleFormData({
      scheduled_date: event.date,
      routine_id: event.routine_id || '',
      title: event.title || '',
      notes: event.notes || ''
    });
    setShowScheduleModal(true);
  };

  // Guardar planificación (crear o editar)
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    try {
      const payload = {
        scheduled_date: scheduleFormData.scheduled_date,
        routine_id: scheduleFormData.routine_id ? parseInt(scheduleFormData.routine_id, 10) : null,
        title: scheduleFormData.title.trim() || null,
        notes: scheduleFormData.notes.trim() || ''
      };

      if (editingSchedule) {
        await updateScheduledWorkout(editingSchedule.id, payload);
        showToast('¡Sesión planificada actualizada con éxito!');
      } else {
        await createScheduledWorkout(payload);
        showToast('¡Sesión planificada guardada en tu calendario!');
      }

      setShowScheduleModal(false);
      await fetchCalendar();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al guardar entrenamiento planificado.', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Eliminar planificación
  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('¿Deseas eliminar este entrenamiento planificado?')) return;
    try {
      await deleteScheduledWorkout(scheduleId);
      showToast('Planificación eliminada.');
      await fetchCalendar();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al eliminar planificación.', 'error');
    }
  };

  // Iniciar entrenamiento planificado
  const handleStartWorkout = (event) => {
    if (event.routine_id) {
      navigate(`/workout?routineId=${event.routine_id}`);
    } else {
      navigate('/workout');
    }
  };

  // Mapa de eventos por fecha (YYYY-MM-DD)
  const eventsByDate = {};
  if (calendarData?.events) {
    calendarData.events.forEach((ev) => {
      if (!eventsByDate[ev.date]) {
        eventsByDate[ev.date] = [];
      }
      eventsByDate[ev.date].push(ev);
    });
  }

  // Renderizar los puntitos indicadores en cada casilla del calendario
  const renderTileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    const dateKey = formatDateKey(date);
    const dayEvents = eventsByDate[dateKey] || [];
    if (dayEvents.length === 0) return null;

    const hasCompleted = dayEvents.some((e) => e.type === 'completed');
    const hasScheduled = dayEvents.some((e) => e.type === 'scheduled');

    return (
      <div className="tile-dots-container">
        {hasCompleted && <span className="tile-dot tile-dot-completed" title="Entrenamiento completado" />}
        {hasScheduled && <span className="tile-dot tile-dot-scheduled" title="Entrenamiento planificado" />}
      </div>
    );
  };

  // Eventos del día seleccionado
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedDayEvents = eventsByDate[selectedDateKey] || [];
  const completedDayEvents = selectedDayEvents.filter((e) => e.type === 'completed');
  const scheduledDayEvents = selectedDayEvents.filter((e) => e.type === 'scheduled');

  const isFriendView = Boolean(selectedFriendId);
  const selectedFriend = friends.find((f) => f.friend_details && f.friend_details.id === selectedFriendId);

  return (
    <div style={{ paddingBottom: '2.5rem', animation: 'fadeIn 0.25s ease-in-out' }}>
      {/* Toast Notification Banner */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1100,
            background: toast.type === 'error' ? 'var(--danger-gradient, #FF3B30)' : 'var(--mint-gradient, #34C759)',
            color: '#FFFFFF',
            padding: '0.85rem 1.4rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600',
            fontSize: '0.95rem'
          }}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.8rem' }}>📅</span>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
              Calendario de Entrenamientos
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Visualiza tu historial de sesiones y planifica tus próximos entrenamientos
          </p>
        </div>

        {/* Selector de Mi Calendario vs Calendario de Amigos */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedFriendId || ''}
            onChange={handleFriendChange}
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-line)',
              padding: '0.65rem 1rem',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              minWidth: '220px'
            }}
          >
            <option value="">👤 Mi Calendario</option>
            {friends.map((f) => {
              const friend = f.friend_details;
              if (!friend) return null;
              return (
                <option key={friend.id} value={friend.id}>
                  👥 Calendario de @{friend.username}
                </option>
              );
            })}
          </select>

          {!isFriendView && (
            <button
              onClick={() => handleOpenScheduleModal(selectedDate)}
              style={{
                background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                color: '#000000',
                border: 'none',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)'
              }}
            >
              <span>➕</span> Planificar Sesión
            </button>
          )}
        </div>
      </div>

      {/* Banner si estás viendo el calendario de un amigo */}
      {isFriendView && selectedFriend && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: 'rgba(10, 132, 255, 0.1)',
            border: '1px solid rgba(10, 132, 255, 0.25)',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>👁️</span>
            <div>
              <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                Estás viendo el calendario de @{selectedFriend.friend_details.username}
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Modo lectura (sesiones completadas y planificadas por tu compañero)
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedFriendId(null);
              setSearchParams({});
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-line)',
              color: 'var(--text-primary)',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ← Volver a mi calendario
          </button>
        </div>
      )}

      {/* Error de privacidad de amigo */}
      {error && isFriendView && (
        <div
          className="glass-panel"
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            borderRadius: '20px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-line)',
            marginBottom: '2rem'
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontWeight: '700' }}>
            Acceso Privado al Calendario
          </h3>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '450px', marginInline: 'auto' }}>
            {error}
          </p>
          <button
            onClick={() => {
              setSelectedFriendId(null);
              setSearchParams({});
            }}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-line)',
              color: 'var(--text-primary)',
              padding: '0.6rem 1.2rem',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Ver Mi Calendario
          </button>
        </div>
      )}

      {/* Error no bloqueante para calendario propio */}
      {error && !isFriendView && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(255, 59, 48, 0.12)',
            border: '1px solid rgba(255, 59, 48, 0.3)',
            color: 'var(--danger, #FF3B30)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.9rem'
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => fetchCalendar()}
            style={{
              background: 'transparent',
              border: '1px solid currentColor',
              color: 'inherit',
              padding: '0.3rem 0.6rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Grilla Principal del Calendario */}
      {!(error && isFriendView) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
            gap: '1.75rem',
            alignItems: 'start'
          }}
          className="workout-card"
        >
          {/* Columna Izquierda: Calendario React-Calendar */}
          <div className="custom-calendar-container">
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              tileContent={renderTileContent}
              prev2Label={null}
              next2Label={null}
              locale="es-ES"
            />

            {/* Leyenda de Colores */}
            <div
              className="glass-panel"
              style={{
                marginTop: '1rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                borderRadius: '16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-line)',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span className="tile-dot tile-dot-completed" style={{ width: '10px', height: '10px' }} />
                <span>Completado ({calendarData?.total_completed || 0})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span className="tile-dot tile-dot-scheduled" style={{ width: '10px', height: '10px' }} />
                <span>Planificado ({calendarData?.total_scheduled || 0})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '1px solid var(--accent)', background: 'rgba(52,199,89,0.2)' }} />
                <span>Hoy</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Detalle del Día Seleccionado */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-line)'
            }}
          >
            {/* Header del día */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-line)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: '700' }}>
                  Detalle del Día
                </span>
                <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
              </div>

              {!isFriendView && (
                <button
                  onClick={() => handleOpenScheduleModal(selectedDate)}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-line)',
                    color: 'var(--accent)',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  + Planificar
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                Cargando entrenamientos...
              </div>
            ) : selectedDayEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🍃</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Día de descanso
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  No hay entrenamientos registrados ni planificados para esta fecha.
                </div>
                {!isFriendView && (
                  <button
                    onClick={() => handleOpenScheduleModal(selectedDate)}
                    style={{
                      background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                      color: '#000000',
                      border: 'none',
                      padding: '0.55rem 1.2rem',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    📅 Planificar entrenamiento aquí
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 1. Entrenamientos Completados */}
                {completedDayEvents.map((ev) => (
                  <div
                    key={`comp-${ev.id}`}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '14px',
                      background: 'var(--bg-input)',
                      border: '1px solid rgba(52, 199, 89, 0.25)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          background: 'rgba(52, 199, 89, 0.15)',
                          color: 'var(--accent)',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        🟢 Completado
                      </span>
                      {ev.duration_minutes && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          ⏱️ {ev.duration_minutes} mins
                        </span>
                      )}
                    </div>

                    <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {ev.title}
                    </h4>

                    {/* Métricas */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      {ev.sets_count > 0 && (
                        <span style={{ fontSize: '0.75rem', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-line)', color: 'var(--text-primary)' }}>
                          🔥 {ev.sets_count} series
                        </span>
                      )}
                      {ev.total_volume_kg > 0 && (
                        <span style={{ fontSize: '0.75rem', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-line)', color: 'var(--accent)', fontWeight: '600' }}>
                          ⚡ {ev.total_volume_kg.toLocaleString()} kg total
                        </span>
                      )}
                    </div>

                    {/* Desglose de ejercicios */}
                    {ev.exercises && ev.exercises.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.4rem' }}>
                        {ev.exercises.map((name, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-line)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}

                    {ev.notes && (
                      <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{ev.notes}"
                      </div>
                    )}
                  </div>
                ))}

                {/* 2. Entrenamientos Planificados */}
                {scheduledDayEvents.map((ev) => (
                  <div
                    key={`sched-${ev.id}`}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '14px',
                      background: 'var(--bg-input)',
                      border: '1px solid rgba(10, 132, 255, 0.25)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          background: 'rgba(10, 132, 255, 0.15)',
                          color: '#0A84FF',
                          padding: '3px 9px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '700'
                        }}
                      >
                        🔵 Planificado
                      </span>

                      {!isFriendView && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditSchedule(ev)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Editar planificación"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(ev.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                            title="Eliminar planificación"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {ev.title}
                    </h4>

                    {ev.routine_name && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Rutina asignada: <strong style={{ color: 'var(--text-primary)' }}>{ev.routine_name}</strong>
                      </div>
                    )}

                    {ev.notes && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                        "{ev.notes}"
                      </div>
                    )}

                    {!isFriendView && (
                      <button
                        onClick={() => handleStartWorkout(ev)}
                        style={{
                          width: '100%',
                          marginTop: '0.5rem',
                          background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                          color: '#000000',
                          border: 'none',
                          padding: '0.55rem',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ ¡Entrenar Ahora!
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Planificar / Editar Entrenamiento */}
      {showScheduleModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '20px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-line)',
              padding: '1.75rem',
              boxShadow: '0 20px 48px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {editingSchedule ? '✏️ Editar Sesión Planificada' : '📅 Planificar Entrenamiento'}
              </h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Fecha Planificada
                </label>
                <input
                  type="date"
                  required
                  value={scheduleFormData.scheduled_date}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, scheduled_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Rutina a Entrenar
                </label>
                <select
                  value={scheduleFormData.routine_id}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, routine_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">-- Sin rutina específica --</option>
                  {routines.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Título Personalizado (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Día de Fuerza / Pruebas de PR"
                  value={scheduleFormData.title}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Notas u Objetivos
                </label>
                <textarea
                  rows="3"
                  placeholder="Ej: Aumentar peso en sentadillas, 3 min descanso..."
                  value={scheduleFormData.notes}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-line)',
                    color: 'var(--text-secondary)',
                    padding: '0.65rem 1.2rem',
                    borderRadius: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  style={{
                    background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                    color: '#000000',
                    border: 'none',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {savingSchedule ? 'Guardando...' : editingSchedule ? 'Actualizar' : 'Planificar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
