import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { startWorkout, addSet, removeSet, finishWorkout } from '../services/workoutService';
import { getExercises } from '../services/exerciseService';
import { getRoutines } from '../services/routineService';

// --- Paleta "Soft Fitness" ---
const colors = {
  background: 'var(--bg-primary)',
  cardBg: 'var(--bg-card)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  mintGradient: 'var(--mint-gradient)',
  dangerGradient: 'var(--danger-gradient)',
  cardShadow: 'var(--shadow-card)',
  borderLine: 'var(--border-line)',
  peachLight: 'var(--peach-light)',
  peachText: 'var(--peach-text)',
  accentRed: 'var(--mint-gradient)',
  successGreen: 'var(--mint-gradient)',
  danger: 'var(--danger)',
  inputBg: 'var(--bg-input)'
};

const WorkoutSession = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [activeLog, setActiveLog] = useState(null);
  const [activeRoutine, setActiveRoutine] = useState(null);
  
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
  const [errorMsg, setErrorMsg] = useState('');

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
    setErrorMsg('');
    try {
      const log = await startWorkout({ routine_id: routineId, notes: '' });
      setActiveLog(log);
      
      // Si se escogió una rutina, cargar sus ejercicios en la vista activa
      if (routineId) {
        const routine = routines.find(r => r.id === routineId);
        if (routine) {
          setActiveRoutine(routine);
          const mappedEx = routine.routine_exercises.map(rx => rx.exercise);
          setActiveExercises(mappedEx);
        }
      } else {
        setActiveRoutine(null);
      }
    } catch (err) {
      console.error("Error iniciando", err);
      setErrorMsg(err.response?.data?.detail || "Error al iniciar el entrenamiento");
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

  const isBwExercise = (ex) => {
    if (!ex) return false;
    return Boolean(
      ex.is_bodyweight || 
      (ex.equipment && ex.equipment.toLowerCase().includes('peso corporal'))
    );
  };

  const handleSaveSet = async (exercise) => {
    setErrorMsg('');
    const input = currentInputs[exercise.id];
    if (!input || input.reps === undefined || input.reps === '') return;
    
    const userWeight = Number(user?.weight_kg || user?.peso || 0);
    const isBw = isBwExercise(exercise);
    
    let finalWeight = 0;
    if (isBw) {
      const addedWeight = input.weight !== '' && !isNaN(input.weight) ? parseFloat(input.weight) : 0;
      finalWeight = userWeight + addedWeight;
    } else {
      finalWeight = parseFloat(input.weight || 0);
    }
    
    try {
      const newSet = await addSet(activeLog.id, {
        exercise_id: exercise.id,
        weight_kg: finalWeight,
        reps_completed: parseInt(input.reps)
      });
      
      setSavedSets([...savedSets, newSet]);
      
      // Limpiar inputs
      setCurrentInputs({
        ...currentInputs,
        [exercise.id]: { weight: '', reps: '' }
      });
    } catch (err) {
      const detail = err.response?.data?.detail || "Error al guardar la serie";
      setErrorMsg(detail);
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
        <h1 style={{ marginBottom: '1rem', textAlign: 'center' }}>¿Qué vamos a entrenar hoy?</h1>
        <p style={{ color: colors.textSecondary, marginBottom: '2rem', maxWidth: '600px', textAlign: 'center', lineHeight: '1.5', fontSize: '1.1rem' }}>
          Elige <strong>Entrenamiento Libre</strong> si quieres improvisar y añadir ejercicios manualmente sobre la marcha. Si prefieres seguir un plan estructurado, selecciona una de tus <strong>Rutinas</strong> guardadas para cargar todos sus ejercicios automáticamente.
        </p>
        
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', border: `1px solid ${colors.borderLine}`, maxWidth: '600px', marginBottom: '3rem', fontSize: '0.95rem', color: colors.textSecondary, lineHeight: '1.5' }}>
          💡 <strong>¿Cómo registro mi progreso?</strong><br/>
          Dentro de la sesión verás tus ejercicios. A medida que termines cada <em>serie (set)</em> real, escribe los <strong>kg</strong> (o lastre adicional en peso corporal) y las <strong>reps</strong> y pulsa el botón <strong>(✓)</strong>. Puedes ir guardando serie a serie mientras descansas.
        </div>
        
        {errorMsg && (
          <div style={{ color: 'red', backgroundColor: '#ffeef0', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <button 
          onClick={() => handleStartWorkout(null)}
          style={{ width: '100%', maxWidth: '400px', padding: '1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '3rem', boxShadow: '0 8px 20px rgba(52, 199, 89, 0.3)' }}
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
              <span style={{ color: 'var(--accent, #34c759)' }}>▶</span>
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
          <span style={{ color: colors.textSecondary }}>Log #{activeLog.id} {activeRoutine ? `• ${activeRoutine.name}` : '• Libre'}</span>
        </div>
        <button 
          onClick={handleFinish}
          style={{ padding: '0.75rem 1.5rem', background: colors.successGreen, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(32, 191, 85, 0.4)' }}
        >
          Terminar Entrenamiento
        </button>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

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
          const isBw = isBwExercise(ex);
          const userWeight = Number(user?.weight_kg || user?.peso || 0);

          // Comprobar límite de series si proviene de una rutina
          let maxSets = null;
          if (activeRoutine && activeRoutine.routine_exercises) {
            const rEx = activeRoutine.routine_exercises.find(rx => rx.exercise_id === ex.id || rx.exercise?.id === ex.id);
            if (rEx && rEx.sets) {
              maxSets = rEx.sets;
            }
          }

          const limitReached = maxSets !== null && exSets.length >= maxSets;
          const addedKg = currentInput.weight !== '' && !isNaN(currentInput.weight) ? parseFloat(currentInput.weight) : 0;
          const totalBwKg = userWeight + addedKg;

          return (
            <div key={ex.id} style={{ background: colors.cardBg, padding: '1.5rem', borderRadius: '12px', border: `1px solid ${colors.borderLine}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `1px solid ${colors.borderLine}`, paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, color: colors.textPrimary, fontSize: '1.25rem' }}>{ex.name}</h2>
                  {isBw && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent, #34c759)', fontWeight: '600', marginTop: '4px', display: 'inline-block' }}>
                      ⚖️ Ejercicio con peso corporal (Tu peso: {userWeight > 0 ? `${userWeight} kg` : 'no definido'})
                    </span>
                  )}
                </div>
                {maxSets !== null && (
                  <span style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    backgroundColor: limitReached ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255,255,255,0.08)',
                    color: limitReached ? 'var(--accent, #34c759)' : colors.textSecondary
                  }}>
                    {limitReached ? `✓ Completado (${exSets.length}/${maxSets})` : `Series: ${exSets.length} / ${maxSets}`}
                  </span>
                )}
              </div>
              
              {/* Sets guardados (Read-only) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {exSets.map((set, idx) => {
                  let displayWeight = `${set.weight_kg} kg`;
                  if (isBw && userWeight > 0) {
                    const diff = Math.round((set.weight_kg - userWeight) * 10) / 10;
                    if (diff > 0) {
                      displayWeight = `${set.weight_kg} kg (${userWeight} + ${diff} lastre)`;
                    } else if (diff === 0) {
                      displayWeight = `${set.weight_kg} kg (corporal)`;
                    }
                  }

                  return (
                    <div key={set.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', border: `1px solid ${colors.borderLine}`, padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <span style={{ width: '40px', fontWeight: 'bold', color: colors.textSecondary }}>#{idx + 1}</span>
                      <span style={{ fontWeight: '600' }}>{displayWeight}</span>
                      <span>x {set.reps_completed} reps</span>
                      <button 
                        onClick={() => handleRemoveSet(set.id)}
                        style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                        title="Eliminar serie"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Fila de Input Activo */}
              {limitReached ? (
                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(52, 199, 89, 0.1)', borderRadius: '8px', color: 'var(--accent, #34c759)', fontSize: '0.9rem', fontWeight: '600' }}>
                  🎉 Has alcanzado el objetivo de {maxSets} series pautado en tu rutina para este ejercicio.
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ width: '40px', fontWeight: 'bold', color: colors.accentRed }}>#{exSets.length + 1}</span>
                    <input 
                      type="number" step="0.5" 
                      placeholder={isBw ? "+ lastre kg (0)" : "kg"} 
                      value={currentInput.weight} 
                      onChange={(e) => handleInputChange(ex.id, 'weight', e.target.value)}
                      style={inputStyle} 
                    />
                    <input 
                      type="number" placeholder="reps" 
                      value={currentInput.reps} 
                      onChange={(e) => handleInputChange(ex.id, 'reps', e.target.value)}
                      style={inputStyle} 
                    />
                    <button 
                      onClick={() => handleSaveSet(ex)}
                      style={{ padding: '0.75rem 1.25rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                      title="Guardar serie"
                    >
                      ✓
                    </button>
                  </div>

                  {/* Detalle visual dinámico para ejercicios de peso corporal */}
                  {isBw && (
                    <div style={{ fontSize: '0.8rem', color: colors.textSecondary, marginTop: '0.5rem', marginLeft: '45px' }}>
                      {userWeight > 0 ? (
                        <>
                          💡 Carga total calculada: <strong>{totalBwKg} kg</strong> {addedKg > 0 ? `(${userWeight} corporal + ${addedKg} lastre)` : `(peso corporal)`}
                        </>
                      ) : (
                        <span style={{ color: '#fca5a5' }}>
                          ⚠️ No tienes configurado tu peso corporal. Se usará solo el valor ingresado.
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
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
  background: 'var(--bg-input, rgba(255,255,255,0.05))',
  border: `1px solid var(--border-line, rgba(255,255,255,0.15))`,
  borderRadius: '8px',
  color: 'inherit',
  textAlign: 'center',
  fontSize: '1rem'
};

export default WorkoutSession;

