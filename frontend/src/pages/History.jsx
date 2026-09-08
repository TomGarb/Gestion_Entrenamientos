import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getWorkoutHistory } from '../services/workoutService';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getWorkoutHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandedIds.size === filteredHistory.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredHistory.map((item) => item.id)));
    }
  };

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter((log) => {
      const routineName = (log.routine?.name || 'Entrenamiento Libre').toLowerCase();
      const dateStr = new Date(log.created_at || log.date).toLocaleDateString();
      const hasExercise = log.sets?.some((s) => s.exercise?.name?.toLowerCase().includes(q));
      return routineName.includes(q) || dateStr.includes(q) || hasExercise;
    });
  }, [history, searchQuery]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(52, 199, 89, 0.2)', borderTop: '3px solid var(--accent, #34c759)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Cargando entrenamientos pasados...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '800', fontSize: '1.85rem', letterSpacing: '-0.02em' }}>
            Historial de Entrenamientos
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            {history.length} {history.length === 1 ? 'sesión registrada' : 'sesiones registradas'}. Toca cualquier entrenamiento para desdoblar y ver su detalle.
          </p>
        </div>

        {history.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleExpandAll}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-line)',
                color: 'var(--text-primary)',
                padding: '0.55rem 1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {expandedIds.size === filteredHistory.length && filteredHistory.length > 0
                ? 'Plegar todos ▲'
                : 'Desdoblar todos ▼'}
            </button>
          </div>
        )}
      </div>

      {/* Buscador Rápido (si hay al menos 3 sesiones) */}
      {history.length >= 3 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            type="text"
            placeholder="Buscar por rutina, ejercicio o fecha..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '14px',
              border: '1px solid var(--border-line)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </div>
      )}

      {/* Listado de Entrenamientos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filteredHistory.map((log) => {
          const isExpanded = expandedIds.has(log.id);
          const routineName = log.routine ? log.routine.name : 'Entrenamiento Libre';
          const logDate = new Date(log.created_at || log.date);
          const formattedDate = logDate.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          const duration = log.duration_minutes ? `${log.duration_minutes} min` : '-- min';

          // Agrupar sets por ejercicio para mostrarlos ordenados
          const groupedSets = (log.sets || []).reduce((acc, set) => {
            const exId = set.exercise_id;
            if (!acc[exId]) {
              acc[exId] = {
                exerciseName: set.exercise ? set.exercise.name : 'Ejercicio Desconocido',
                muscleGroup: set.exercise?.muscle_group || null,
                sets: [],
              };
            }
            acc[exId].sets.push(set);
            return acc;
          }, {});

          const totalSetsCount = log.sets?.length || 0;

          return (
            <div
              key={log.id}
              style={{
                borderRadius: '18px',
                backgroundColor: 'var(--bg-card)',
                border: isExpanded ? '1px solid rgba(52, 199, 89, 0.35)' : '1px solid var(--border-line)',
                boxShadow: isExpanded ? '0 8px 24px rgba(0, 0, 0, 0.12)' : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
              }}
            >
              {/* Tarjeta Colapsada (Solo muestra: Nombre, Fecha, Duración + Flecha de desdoblar) */}
              <div
                onClick={() => toggleExpand(log.id)}
                style={{
                  padding: '1.1rem 1.4rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  gap: '1rem',
                }}
              >
                {/* Lado Izquierdo: Nombre de la rutina */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: isExpanded ? 'rgba(52, 199, 89, 0.15)' : 'var(--bg-input)',
                      border: isExpanded ? '1px solid var(--accent)' : '1px solid var(--border-line)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ⚡
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: '1.1rem',
                        color: 'var(--text-primary)',
                        fontWeight: '700',
                        letterSpacing: '-0.2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {routineName}
                    </h2>

                    {/* Fecha y Duración */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '3px',
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>📅 {formattedDate}</span>
                      <span>•</span>
                      <span style={{ color: log.duration_minutes ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: log.duration_minutes ? '600' : 'normal' }}>
                        ⏱️ {duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Derecho: Botón / Indicador de Desdoblar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: isExpanded ? 'var(--accent)' : 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: isExpanded ? 'rgba(52, 199, 89, 0.12)' : 'var(--bg-input)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isExpanded ? 'Ocultar' : 'Ver detalle'}
                    <span
                      style={{
                        display: 'inline-block',
                        transition: 'transform 0.25s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▾
                    </span>
                  </span>
                </div>
              </div>

              {/* Contenido Desdoblado (Detalle Completo) */}
              {isExpanded && (
                <div
                  style={{
                    padding: '0 1.4rem 1.4rem 1.4rem',
                    borderTop: '1px solid var(--border-line)',
                    background: 'rgba(0, 0, 0, 0.08)',
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

                  {/* Resumen rápido de series */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    <span>{Object.keys(groupedSets).length} ejercicios • {totalSetsCount} series completadas</span>
                    {log.calories_burned > 0 && (
                      <span style={{ color: '#ff9500', fontWeight: '600' }}>🔥 ~{Math.round(log.calories_burned)} kcal quemadas</span>
                    )}
                  </div>

                  {log.notes && (
                    <div
                      style={{
                        background: 'var(--bg-input)',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        marginBottom: '1rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        borderLeft: '3px solid var(--accent)',
                      }}
                    >
                      <strong>Nota:</strong> {log.notes}
                    </div>
                  )}

                  {Object.keys(groupedSets).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      {Object.values(groupedSets).map((group, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--bg-input)',
                            padding: '1rem 1.25rem',
                            borderRadius: '14px',
                            border: '1px solid var(--border-line)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                              {group.exerciseName}
                            </h3>
                            {group.muscleGroup && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  textTransform: 'capitalize',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: 'var(--text-secondary)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                {group.muscleGroup}
                              </span>
                            )}
                          </div>

                          {/* Chips de Series */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                            {group.sets.map((set, sIdx) => {
                              const equip = set.tipo_equipamiento || 'peso_libre';
                              const equipLabel =
                                equip === 'maquina_guiada' ? 'Máq' : equip === 'polea' ? 'Pol' : equip === 'peso_corporal' ? 'Corp' : null;

                              return (
                                <div
                                  key={set.id || sIdx}
                                  style={{
                                    backgroundColor: 'var(--bg-card)',
                                    padding: '0.5rem 0.85rem',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-line)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: '78px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                      S{set.set_number || sIdx + 1}
                                    </span>
                                    {equipLabel && (
                                      <span style={{ fontSize: '0.62rem', background: 'rgba(52, 199, 89, 0.15)', color: 'var(--accent)', padding: '1px 4px', borderRadius: '4px' }}>
                                        {equipLabel}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '0.95rem', marginTop: '2px' }}>
                                    {set.weight_kg} kg
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                    {set.reps_completed} reps
                                  </span>
                                  {set.fuerza_bruta_estimada && set.fuerza_bruta_estimada !== set.weight_kg && (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: '600', marginTop: '2px' }}>
                                      FB: {set.fuerza_bruta_estimada}kg
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>
                      No se registraron ejercicios detallados en esta sesión.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Sin resultados tras filtrar */}
        {filteredHistory.length === 0 && history.length > 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border-line)' }}>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              No se encontraron entrenamientos que coincidan con "{searchQuery}".
            </p>
          </div>
        )}

        {/* Historial completamente vacío */}
        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-line)' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🏋️</span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: '700' }}>
              Aún no tienes entrenamientos completados
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '420px', margin: '0.5rem auto 1.5rem auto' }}>
              Cuando completes una rutina o sesión libre, podrás revisar aquí todas tus series, cargas y tiempos.
            </p>
            <Link
              to="/workout"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--accent)',
                color: '#000000',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                fontSize: '0.95rem',
                boxShadow: '0 4px 14px rgba(52, 199, 89, 0.35)',
              }}
            >
              Iniciar un Entrenamiento Ahora
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
