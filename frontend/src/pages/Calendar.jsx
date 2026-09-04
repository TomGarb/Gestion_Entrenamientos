import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import {
  getScheduledWorkouts,
  createScheduledWorkout,
  inviteFriendToWorkout,
  acceptWorkoutInvitation,
  rejectWorkoutInvitation,
  deleteScheduledWorkout
} from '../services/scheduledWorkoutService';
import { getRoutines } from '../services/routineService';
import { getFriends } from '../services/communityService';

const WorkoutCalendar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [scheduledList, setScheduledList] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected date on calendar
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('schedule'); // 'schedule' | 'invite'
  const [formData, setFormData] = useState({
    routine_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    is_invite: false,
    friend_id: '',
    notes: '',
    schedule_for_me: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Check if router state passed a routine to schedule
  useEffect(() => {
    if (location.state?.preselectedRoutineId) {
      setFormData(prev => ({
        ...prev,
        routine_id: String(location.state.preselectedRoutineId),
        is_invite: location.state?.mode === 'invite'
      }));
      setShowModal(true);
    }
  }, [location.state]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [workoutsData, routinesData, friendsData] = await Promise.all([
        getScheduledWorkouts().catch(() => []),
        getRoutines().catch(() => []),
        getFriends().catch(() => [])
      ]);
      setScheduledList(workoutsData || []);
      setRoutines(routinesData || []);
      setFriends(friendsData || []);

      if (routinesData && routinesData.length > 0 && !formData.routine_id) {
        setFormData(prev => ({ ...prev, routine_id: String(routinesData[0].id) }));
      }
    } catch (err) {
      console.error('Error cargando datos del calendario:', err);
    } finally {
      setLoading(false);
    }
  };

  const toLocalDateString = (d) => {
    const dateObj = new Date(d);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const selectedDateStr = toLocalDateString(selectedDate);

  // Workouts for the selected date
  const dayWorkouts = scheduledList.filter(
    (sw) => sw.scheduled_date === selectedDateStr
  );

  // Map of date string -> array of scheduled workouts for tile markers
  const dateMap = scheduledList.reduce((acc, item) => {
    if (!acc[item.scheduled_date]) {
      acc[item.scheduled_date] = [];
    }
    acc[item.scheduled_date].push(item);
    return acc;
  }, {});

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setFormData(prev => ({
      ...prev,
      scheduled_date: toLocalDateString(newDate)
    }));
  };

  const openScheduleModal = (routineId = '', isInvite = false) => {
    setFormData({
      routine_id: routineId ? String(routineId) : (routines[0]?.id ? String(routines[0].id) : ''),
      scheduled_date: selectedDateStr,
      is_invite: isInvite,
      friend_id: friends[0]?.friend_details?.id ? String(friends[0].friend_details.id) : '',
      notes: '',
      schedule_for_me: true
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.routine_id) {
      alert('Debes seleccionar una rutina.');
      return;
    }
    if (formData.is_invite && !formData.friend_id) {
      alert('Debes seleccionar a un amigo para enviar la invitación.');
      return;
    }

    setSubmitting(true);
    try {
      if (formData.is_invite) {
        await inviteFriendToWorkout({
          friend_id: parseInt(formData.friend_id),
          routine_id: parseInt(formData.routine_id),
          scheduled_date: formData.scheduled_date,
          notes: formData.notes,
          schedule_for_me: formData.schedule_for_me
        });
        alert('🎉 ¡Invitación enviada exitosamente!');
      } else {
        await createScheduledWorkout({
          routine_id: parseInt(formData.routine_id),
          scheduled_date: formData.scheduled_date,
          notes: formData.notes
        });
      }

      setShowModal(false);
      await fetchInitialData();
    } catch (err) {
      console.error('Error agendando sesión:', err);
      alert(err.response?.data?.detail || 'Error al agendar la sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (workoutId) => {
    setActionLoading(prev => ({ ...prev, [workoutId]: true }));
    try {
      await acceptWorkoutInvitation(workoutId);
      await fetchInitialData();
    } catch (err) {
      console.error('Error aceptando invitación:', err);
      alert(err.response?.data?.detail || 'Error al aceptar invitación.');
    } finally {
      setActionLoading(prev => ({ ...prev, [workoutId]: false }));
    }
  };

  const handleReject = async (workoutId) => {
    if (!window.confirm('¿Rechazar esta invitación a entrenar?')) return;
    setActionLoading(prev => ({ ...prev, [workoutId]: true }));
    try {
      await rejectWorkoutInvitation(workoutId);
      await fetchInitialData();
    } catch (err) {
      console.error('Error rechazando invitación:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [workoutId]: false }));
    }
  };

  const handleDelete = async (workoutId) => {
    if (!window.confirm('¿Eliminar este entrenamiento agendado?')) return;
    try {
      await deleteScheduledWorkout(workoutId);
      setScheduledList(prev => prev.filter(w => w.id !== workoutId));
    } catch (err) {
      console.error('Error eliminando sesión agendada:', err);
    }
  };

  const handleStartWorkout = (sw) => {
    if (sw.routine_id) {
      navigate('/workout', { state: { routine_id: sw.routine_id } });
    } else {
      navigate('/workout');
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dStr = toLocalDateString(date);
      const items = dateMap[dStr];
      if (!items || items.length === 0) return null;

      const hasPending = items.some(i => i.status === 'pending');
      const hasScheduled = items.some(i => i.status === 'scheduled' || i.status === 'accepted');

      return (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginTop: '3px' }}>
          {hasPending && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#FF9500',
                display: 'inline-block'
              }}
              title="Invitación pendiente"
            />
          )}
          {hasScheduled && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--accent, #34C759)',
                display: 'inline-block'
              }}
              title="Entrenamiento agendado"
            />
          )}
        </div>
      );
    }
    return null;
  };

  const formatDateDisplay = (dateObj) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString('es-AR', options);
  };

  return (
    <div style={{ paddingBottom: '3rem', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Calendario de Entrenamientos
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Programa tus rutinas y cita a tus amigos para entrenar juntos
          </p>
        </div>

        <button
          onClick={() => openScheduleModal('', false)}
          style={{
            background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
            color: '#000000',
            border: 'none',
            padding: '0.75rem 1.4rem',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 8px 16px rgba(52, 199, 89, 0.25)'
          }}
        >
          <span>📅</span>
          <span>Agendar / Invitar</span>
        </button>
      </div>

      {/* Main Grid: Calendar on Left, Selected Day Workouts on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.75rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: Calendar Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Selecciona una fecha
            </span>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent, #34C759)' }}></span> Agendado
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF9500' }}></span> Pendiente
              </span>
            </div>
          </div>

          <div className="custom-calendar-container">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              tileContent={tileContent}
              locale="es-AR"
            />
          </div>
        </div>

        {/* Right Column: Selected Day Workouts & Agenda */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-line)', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Agenda del Día
              </span>
              <h2 style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {formatDateDisplay(selectedDate)}
              </h2>
            </div>

            <button
              onClick={() => openScheduleModal('', false)}
              style={{
                background: 'rgba(52, 199, 89, 0.15)',
                color: 'var(--accent)',
                border: '1px solid rgba(52, 199, 89, 0.3)',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              + Agregar
            </button>
          </div>

          {/* List of Day's Workouts */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {dayWorkouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border-line)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧘‍♂️</div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Sin entrenamientos agendados
                </div>
                <p style={{ fontSize: '0.85rem', maxWidth: '280px', margin: '0 0 1rem 0' }}>
                  Aprovecha el día para descansar o planifica una rutina con un amigo.
                </p>
                <button
                  onClick={() => openScheduleModal('', true)}
                  style={{
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-line)',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>👥</span>
                  <span>Citar a un Amigo</span>
                </button>
              </div>
            ) : (
              dayWorkouts.map((sw) => {
                const isPending = sw.status === 'pending';
                const isInvited = !!sw.invited_by_id;

                return (
                  <div
                    key={sw.id}
                    style={{
                      background: 'var(--bg-input)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      border: isPending ? '1px solid rgba(255, 149, 0, 0.4)' : '1px solid var(--border-line)',
                      position: 'relative'
                    }}
                  >
                    {/* Header Item */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {sw.routine ? sw.routine.name : 'Entrenamiento Libre'}
                        </h3>

                        {/* Status Badges */}
                        {isPending ? (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 149, 0, 0.15)',
                              color: '#FF9500',
                              fontWeight: '700'
                            }}
                          >
                            ⏳ Invitación de @{sw.invited_by?.username || 'amigo'}
                          </span>
                        ) : isInvited ? (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(52, 199, 89, 0.15)',
                              color: 'var(--accent)',
                              fontWeight: '600'
                            }}
                          >
                            👥 Cita con @{sw.invited_by?.username}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary)',
                              fontWeight: '500'
                            }}
                          >
                            📅 Programado
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDelete(sw.id)}
                        title="Eliminar del calendario"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          padding: '4px'
                        }}
                      >
                        🗑️
                      </button>
                    </div>

                    {/* Notes if any */}
                    {sw.notes && (
                      <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '8px' }}>
                        💬 "{sw.notes}"
                      </p>
                    )}

                    {/* Routine Exercises Preview */}
                    {sw.routine && sw.routine.routine_exercises && sw.routine.routine_exercises.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
                        {sw.routine.routine_exercises.slice(0, 4).map((rx, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-line)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {rx.exercise?.name || 'Ejercicio'} ({rx.sets}x{rx.reps})
                          </span>
                        ))}
                        {sw.routine.routine_exercises.length > 4 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                            +{sw.routine.routine_exercises.length - 4} más
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                      {isPending ? (
                        <>
                          <button
                            disabled={actionLoading[sw.id]}
                            onClick={() => handleAccept(sw.id)}
                            style={{
                              flex: 1,
                              background: 'var(--accent, #34C759)',
                              color: '#000000',
                              border: 'none',
                              padding: '0.55rem',
                              borderRadius: '10px',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {actionLoading[sw.id] ? 'Aceptando...' : '✓ Aceptar e Incorporar'}
                          </button>
                          <button
                            disabled={actionLoading[sw.id]}
                            onClick={() => handleReject(sw.id)}
                            style={{
                              background: 'rgba(255, 59, 48, 0.1)',
                              color: 'var(--danger, #FF3B30)',
                              border: '1px solid rgba(255, 59, 48, 0.2)',
                              padding: '0.55rem 0.9rem',
                              borderRadius: '10px',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            ✕ Rechazar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartWorkout(sw)}
                            style={{
                              flex: 1,
                              background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                              color: '#000000',
                              border: 'none',
                              padding: '0.55rem',
                              borderRadius: '10px',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <span>🚀</span>
                            <span>Iniciar Entrenamiento</span>
                          </button>
                          <button
                            onClick={() => openScheduleModal(sw.routine_id, true)}
                            title="Invitar a otro amigo a esta rutina"
                            style={{
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-line)',
                              color: 'var(--text-primary)',
                              padding: '0.55rem 0.85rem',
                              borderRadius: '10px',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <span>👥</span>
                            <span>Invitar</span>
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* Modal: Agendar / Invitar Amigo */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-line)', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {formData.is_invite ? '👥 Invitar a Entrenar' : '📅 Agendar Entrenamiento'}
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {formData.is_invite ? 'Cita a un compañero para entrenar juntos un día fijo' : 'Planifica tus entrenamientos de la semana'}
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Toggle: Personal vs Invitar Amigo */}
              <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-line)' }}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_invite: false }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: !formData.is_invite ? 'var(--bg-card)' : 'transparent',
                    color: !formData.is_invite ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: !formData.is_invite ? '700' : '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  📅 Solo para mí
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_invite: true }))}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: formData.is_invite ? 'var(--accent)' : 'transparent',
                    color: formData.is_invite ? '#000000' : 'var(--text-secondary)',
                    fontWeight: formData.is_invite ? '700' : '500',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  👥 Invitar a un Amigo
                </button>
              </div>

              {/* Selector de Fecha */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Fecha de la sesión
                </label>
                <input
                  type="date"
                  required
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-line)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Selector de Rutina */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Rutina a realizar
                </label>
                {routines.length === 0 ? (
                  <div style={{ padding: '0.8rem', background: 'var(--bg-input)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    No tienes rutinas creadas.{' '}
                    <span
                      onClick={() => { setShowModal(false); navigate('/routines'); }}
                      style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '700' }}
                    >
                      Crea una aquí ➔
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    value={formData.routine_id}
                    onChange={(e) => setFormData({ ...formData, routine_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.8rem 1rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-line)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  >
                    {routines.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.routine_exercises?.length || 0} ejercicios)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selector de Amigo (si es invitación) */}
              {formData.is_invite && (
                <div>
                  <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Seleccionar Amigo
                  </label>
                  {friends.length === 0 ? (
                    <div style={{ padding: '0.8rem', background: 'var(--bg-input)', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Aún no tienes amigos en la app.{' '}
                      <span
                        onClick={() => { setShowModal(false); navigate('/community'); }}
                        style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '700' }}
                      >
                        Buscar amigos en Comunidad ➔
                      </span>
                    </div>
                  ) : (
                    <select
                      required={formData.is_invite}
                      value={formData.friend_id}
                      onChange={(e) => setFormData({ ...formData, friend_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.8rem 1rem',
                        borderRadius: '12px',
                        border: '1px solid var(--border-line)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="">Selecciona un compañero...</option>
                      {friends.map((f) => (
                        <option key={f.id} value={f.friend_details?.id}>
                          @{f.friend_details?.username} ({f.friend_details?.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Notas / Mensaje */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                  Mensaje o Notas (Opcional)
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={formData.is_invite ? 'Ej: ¡Vamos a romper marcas el jueves!' : 'Ej: Enfocar en técnica y descansos cortos'}
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-line)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Botones de acción del Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '0.95rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || (formData.is_invite && friends.length === 0)}
                  style={{
                    background: 'var(--primary-gradient, linear-gradient(135deg, #34C759 0%, #28CD41 100%))',
                    color: '#000000',
                    border: 'none',
                    padding: '0.75rem 1.8rem',
                    borderRadius: '12px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 8px 16px rgba(52, 199, 89, 0.25)'
                  }}
                >
                  {submitting ? 'Guardando...' : (formData.is_invite ? 'Enviar Invitación' : 'Agendar Sesión')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Custom Styles for react-calendar to perfectly fit GymTracker theme */}
      <style>{`
        .custom-calendar-container .react-calendar {
          width: 100%;
          background: transparent;
          border: none;
          font-family: inherit;
          color: var(--text-primary);
        }
        .custom-calendar-container .react-calendar__navigation {
          margin-bottom: 1rem;
        }
        .custom-calendar-container .react-calendar__navigation button {
          color: var(--text-primary);
          min-width: 44px;
          background: var(--bg-input);
          border: 1px solid var(--border-line);
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 2px;
          padding: 6px 10px;
          transition: all 0.2s ease;
        }
        .custom-calendar-container .react-calendar__navigation button:enabled:hover,
        .custom-calendar-container .react-calendar__navigation button:enabled:focus {
          background: var(--accent);
          color: #000000;
        }
        .custom-calendar-container .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: 700;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .custom-calendar-container .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        .custom-calendar-container .react-calendar__tile {
          padding: 0.85rem 0.5rem;
          background: transparent;
          color: var(--text-primary);
          border-radius: 12px;
          border: 1px solid transparent;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.15s ease;
        }
        .custom-calendar-container .react-calendar__tile:enabled:hover {
          background: var(--bg-input);
          border-color: var(--border-line);
        }
        .custom-calendar-container .react-calendar__tile--now {
          background: rgba(52, 199, 89, 0.1) !important;
          color: var(--accent) !important;
          border: 1px solid rgba(52, 199, 89, 0.4) !important;
        }
        .custom-calendar-container .react-calendar__tile--active {
          background: var(--accent) !important;
          color: #000000 !important;
          font-weight: 800 !important;
          box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3) !important;
        }
        .custom-calendar-container .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--text-secondary);
          opacity: 0.35;
        }
      `}</style>

    </div>
  );
};

export default WorkoutCalendar;
