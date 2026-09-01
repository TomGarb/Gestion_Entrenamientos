import React, { useState, useEffect } from 'react';
import { getWorkoutHistory } from '../services/workoutService';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getWorkoutHistory();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Cargando historial...</h2>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', padding: '2rem', margin: '-2rem', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '700', fontSize: '2.5rem' }}>Historial de Entrenamiento</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6' }}>
          Revisa tus sesiones pasadas para monitorear tu progreso, repeticiones y peso levantado.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {history.map((log) => {
          // Agrupar sets por ejercicio para mostrarlos de forma compacta
          const groupedSets = log.sets.reduce((acc, set) => {
            const exId = set.exercise_id;
            if (!acc[exId]) {
              acc[exId] = {
                exerciseName: set.exercise ? set.exercise.name : 'Ejercicio Desconocido',
                sets: []
              };
            }
            acc[exId].sets.push(set);
            return acc;
          }, {});

          return (
            <div key={log.id} style={{ borderRadius: '24px', padding: '2rem', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-card)', border: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--text-primary)', fontWeight: '700' }}>
                    {log.routine ? log.routine.name : 'Entrenamiento Libre'}
                  </h2>
                  <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    📅 {new Date(log.created_at).toLocaleDateString()} &nbsp; • &nbsp; ⏱️ {log.duration_minutes || '--'} min
                  </p>
                </div>
              </div>

              {Object.keys(groupedSets).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {Object.values(groupedSets).map((group, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '16px' }}>
                      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                        {group.exerciseName}
                      </h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        {group.sets.map((set, sIdx) => (
                          <div key={set.id} style={{ backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Set {sIdx + 1}</span>
                            <span style={{ fontWeight: '700', color: 'var(--peach-text)' }}>{set.weight_kg} kg</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{set.reps_completed} reps</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No se registraron ejercicios en esta sesión.</p>
              )}
            </div>
          );
        })}
        
        {history.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-card)', borderRadius: '24px' }}>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Aún no tienes entrenamientos completados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
