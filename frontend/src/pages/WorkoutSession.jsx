import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { startWorkout, addSet, removeSet, finishWorkout } from '../services/workoutService';
import { getExercises } from '../services/exerciseService';
import { getRoutines } from '../services/routineService';

// --- Paleta "Energía y Potencia" ---
const colors = {
  background: '#0A1128',
  cardBg: '#121F3D',
  borderLine: '#1E325C',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B9BB4',
  accentRed: '#D90429',
  accentRedHover: '#EF233C',
  successGreen: '#20BF55',
  grayedOut: 'rgba(255,255,255,0.1)'
};

const WorkoutSession = () => {
  const navigate = useNavigate();
  const [activeLog, setActiveLog] = useState(null);
  
  // Catálogos
  const [routines, setRoutines] = useState([]);
  const [exercises, setExercises] = useState([]);
  
  // Estado local para los inputs dinámicos de las series en curso por ejercicio
  // Estructura: { exercise_id: { weight: '', reps: '' } }
  const [currentInputs, setCurrentInputs] = useState({});
  // Estructura: Lista de sets guardados para dibujarlos read-only
  const [savedSets, setSavedSets] = useState([]);

  // Ejercicios activos en la sesión actual
  const [activeExercises, setActiveExercises] = useState([]);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      const r = await getRoutines();
      const e = await getExercises();
      setRoutines(r);
      setExercises(e);
    } catch (err) {
      console.error("Error al cargar datos", err);
    }
  };

  const handleStartWorkout = async (routineId = null) => {
    try {
      const log = await startWorkout({ routine_id: routineId, notes: '' });
      setActiveLog(log);
      
      // Si se escogió una rutina, cargar sus ejercicios en la vista activa
      if (routineId) {
        const routine = routines.find(r => r.id === routineId);
        if (routine) {
          const mappedEx = routine.routine_exercises.map(rx => rx.exercise);
          setActiveExercises(mappedEx);
        }
      }
    } catch (err) {
      console.error("Error iniciando", err);
    }
  };

  const handleAddExerciseToSession = (exerciseId) => {
    const ex = exercises.find(e => e.id === parseInt(exerciseId));
    if (ex && !activeExercises.find(a => a.id === ex.id)) {
      setActiveExercises([...activeExercises, ex]);
    }
  };

  const handleInputChange = (exerciseId, field, value) => {
    setCurrentInputs({
      ...currentInputs,
      [exerciseId]: {
        ...currentInputs[exerciseId],
        [field]: value
      }
    });
  };

  const handleSaveSet = async (exerciseId) => {
    const input = currentInputs[exerciseId];
    if (!input || !input.weight || !input.reps) return;
    
    try {
      const newSet = await addSet(activeLog.id, {
        exercise_id: exerciseId,
        weight_kg: parseFloat(input.weight),
        reps_completed: parseInt(input.reps)
      });
      
      setSavedSets([...savedSets, newSet]);
      
      // Limpiar inputs
      setCurrentInputs({
        ...currentInputs,
        [exerciseId]: { weight: '', reps: '' }
      });
    } catch (err) {
      console.error("Error guardando set", err);
    }
  };

  const handleRemoveSet = async (setId) => {
    try {
      await removeSet(setId);
      setSavedSets(savedSets.filter(s => s.id !== setId));
    } catch (err) {
      console.error("Error borrando set", err);
    }
  };

  const handleFinish = async () => {
    if (!window.confirm("¿Seguro que deseas terminar el entrenamiento?")) return;
    try {
      await finishWorkout(activeLog.id);
      navigate('/');
    } catch (err) {
      console.error("Error finalizando", err);
    }
  };

  // --- Vista Inicial: Seleccionar Entrenamiento ---
  if (!activeLog) {
    return (
      <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ marginBottom: '3rem' }}>¿Qué vamos a entrenar hoy?</h1>
        
        <button 
          onClick={() => handleStartWorkout(null)}
          style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '3rem', boxShadow: '0 8px 20px rgba(217, 4, 41, 0.4)' }}
        >
          Iniciar Entrenamiento Libre
        </button>

        <h2 style={{ color: colors.textSecondary, marginBottom: '1.5rem' }}>O iniciar desde una rutina:</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '400px' }}>
          {routines.map(r => (
            <button 
              key={r.id} 
              onClick={() => handleStartWorkout(r.id)}
              style={{ padding: '1.5rem', background: colors.cardBg, color: 'white', border: `1px solid ${colors.borderLine}`, borderRadius: '12px', fontSize: '1.1rem', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{r.name}</span>
              <span style={{ color: colors.accentRed }}>▶</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Vista de Sesión Activa ---
  return (
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem' }}>
      
      {/* Header fijo estilo App */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: `1px solid ${colors.borderLine}` }}>
        <div>
          <span style={{ background: colors.accentRed, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '1rem' }}>EN CURSO</span>
          <span style={{ color: colors.textSecondary }}>Log #{activeLog.id}</span>
        </div>
        <button 
          onClick={handleFinish}
          style={{ padding: '0.75rem 1.5rem', background: colors.successGreen, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(32, 191, 85, 0.4)' }}
        >
          Terminar Entrenamiento
        </button>
      </div>

      {/* Selector para añadir más ejercicios en medio del entreno */}
      <div style={{ marginBottom: '2rem' }}>
        <select 
          onChange={(e) => handleAddExerciseToSession(e.target.value)} 
          style={{ padding: '1rem', width: '100%', maxWidth: '400px', background: colors.cardBg, color: 'white', border: `1px solid ${colors.borderLine}`, borderRadius: '8px', fontSize: '1rem' }}
          value=""
        >
          <option value="" disabled>+ Agregar ejercicio a la sesión...</option>
          {exercises.map(ex => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
      </div>

      {/* Lista de Ejercicios en Sesión */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '100px' }}>
        {activeExercises.map(ex => {
          const exSets = savedSets.filter(s => s.exercise_id === ex.id);
          const currentInput = currentInputs[ex.id] || { weight: '', reps: '' };

          return (
            <div key={ex.id} style={{ background: colors.cardBg, padding: '1.5rem', borderRadius: '12px', border: `1px solid ${colors.borderLine}` }}>
              <h2 style={{ marginTop: 0, color: colors.textPrimary, borderBottom: `1px solid ${colors.borderLine}`, paddingBottom: '0.5rem' }}>{ex.name}</h2>
              
              {/* Sets guardados (Read-only) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {exSets.map((set, idx) => (
                  <div key={set.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.grayedOut, padding: '0.75rem', borderRadius: '6px' }}>
                    <span style={{ width: '40px', fontWeight: 'bold', color: colors.textSecondary }}>{idx + 1}</span>
                    <span>{set.weight_kg} kg</span>
                    <span>x {set.reps_completed} reps</span>
                    <button 
                      onClick={() => handleRemoveSet(set.id)}
                      style={{ background: 'none', border: 'none', color: colors.accentRed, cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                      title="Deshacer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Fila de Input Activo */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ width: '40px', fontWeight: 'bold', color: colors.accentRed }}>{exSets.length + 1}</span>
                <input 
                  type="number" step="0.5" placeholder="kg" 
                  value={currentInput.weight} onChange={(e) => handleInputChange(ex.id, 'weight', e.target.value)}
                  style={inputStyle} 
                />
                <input 
                  type="number" placeholder="reps" 
                  value={currentInput.reps} onChange={(e) => handleInputChange(ex.id, 'reps', e.target.value)}
                  style={inputStyle} 
                />
                <button 
                  onClick={() => handleSaveSet(ex.id)}
                  style={{ padding: '0.75rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const inputStyle = {
  flex: 1,
  padding: '0.75rem',
  background: '#0A1128',
  border: `1px solid #1E325C`,
  borderRadius: '6px',
  color: 'white',
  textAlign: 'center',
  fontSize: '1.1rem'
};

export default WorkoutSession;
