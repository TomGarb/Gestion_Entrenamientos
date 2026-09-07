import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { startWorkout, addSet, removeSet, finishWorkout, getActiveWorkout, abandonWorkout } from '../services/workoutService';
import { getExercises } from '../services/exerciseService';
import { getRoutines } from '../services/routineService';
import DailyNutritionCard from '../components/nutrition/DailyNutritionCard';

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

  const handleResumeSession = (session) => {
    setActiveLog(session);
    setSavedSets(session.sets || []);
    
    // Cargar ejercicios de la rutina o de los sets existentes
    if (session.routine) {
      setActiveRoutine(session.routine);
      const mappedEx = session.routine.routine_exercises?.map(rx => rx.exercise).filter(Boolean) || [];
      const setExs = (session.sets || []).map(s => s.exercise).filter(Boolean);
      const combined = [...mappedEx];
      setExs.forEach(ex => {
        if (!combined.find(c => c.id === ex.id)) combined.push(ex);
      });
      setActiveExercises(combined);
    } else {
      setActiveRoutine(null);
      const setExs = (session.sets || []).map(s => s.exercise).filter(Boolean);
      const unique = [];
      setExs.forEach(ex => {
        if (!unique.find(u => u.id === ex.id)) unique.push(ex);
      });
      setActiveExercises(unique);
    }
    setExistingActiveSession(null);
  };

  const handleFinishExisting = async (sessionId) => {
    try {
      await finishWorkout(sessionId);
      setExistingActiveSession(null);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error finalizando entrenamiento previo");
    }
  };

  const handleDiscardExisting = async (sessionId) => {
    if (!window.confirm("¿Seguro que deseas descartar este entrenamiento en curso?")) return;
    try {
      await abandonWorkout(sessionId);
      setExistingActiveSession(null);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || "Error al descartar la sesión");
    }
  };

  const handleStartWorkout = async (routineId = null) => {
    setErrorMsg('');
    try {
      const log = await startWorkout({ routine_id: routineId, notes: '' });
      setActiveLog(log);
      setSavedSets(log.sets || []);
      
      // Si se escogió una rutina, cargar sus ejercicios en la vista activa
      if (routineId) {
        const routine = routines.find(r => r.id === routineId);
        if (routine) {
          setActiveRoutine(routine);
          const mappedEx = (routine.routine_exercises || [])
            .map(rx => rx.exercise || exercises.find(e => e.id === rx.exercise_id))
            .filter(Boolean);
          setActiveExercises(mappedEx);
        }
      } else {
        setActiveRoutine(null);
        setActiveExercises([]);
      }
    } catch (err) {
      console.error("Error iniciando entrenamiento", err);
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : "Error al iniciar el entrenamiento");
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
    
    if (!input || input.reps === undefined || input.reps === '' || isNaN(parseInt(input.reps, 10)) || parseInt(input.reps, 10) <= 0) {
      setErrorMsg(`Por favor ingresa un número válido de repeticiones (mayor a 0) para ${exercise.name}.`);
      return;
    }
    
    const reps = parseInt(input.reps, 10);
    const userWeight = Number(user?.weight_kg || user?.peso || 0);
    const isBw = isBwExercise(exercise);
    
    let finalWeight = 0;
    if (isBw) {
      const addedWeight = input.weight !== '' && !isNaN(input.weight) ? parseFloat(input.weight) : 0;
      finalWeight = userWeight + addedWeight;
    } else {
      finalWeight = input.weight !== '' && !isNaN(input.weight) ? parseFloat(input.weight) : 0;
    }
    
    try {
      setSavingExerciseId(exercise.id);
      const newSet = await addSet(activeLog.id, {
        exercise_id: exercise.id,
        weight_kg: finalWeight,
        reps_completed: reps
      });
      
      setSavedSets(prev => [...prev, newSet]);
      
      // Limpiar inputs
      setCurrentInputs(prev => ({
        ...prev,
        [exercise.id]: { weight: '', reps: '' }
      }));
    } catch (err) {
      console.error("Error al guardar serie", err);
      const detail = err.response?.data?.detail;
      let formattedError = "Error al guardar la serie";
      if (Array.isArray(detail)) {
        formattedError = detail.map(d => d.msg || JSON.stringify(d)).join(', ');
      } else if (typeof detail === 'object' && detail !== null) {
        formattedError = detail.msg || JSON.stringify(detail);
      } else if (typeof detail === 'string') {
        formattedError = detail;
      }
      setErrorMsg(formattedError);
    } finally {
      setSavingExerciseId(null);
    }
  };

  const handleRemoveSet = async (setId) => {
    try {
      await removeSet(setId);
      setSavedSets(prev => prev.filter(s => s.id !== setId));
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
        <div style={{ width: '100%', maxWidth: '650px', marginBottom: '1.5rem' }}>
          <DailyNutritionCard />
        </div>

        {existingActiveSession && (
          <div style={{
            width: '100%',
            maxWidth: '650px',
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(20, 20, 20, 0.6) 100%)',
            border: '1.5px solid #ff9f0a',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 24px rgba(255, 159, 10, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>⏳</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ff9f0a', fontWeight: '700' }}>
                  Tienes una sesión en progreso ({existingActiveSession.date})
                </h3>
              </div>
              <span style={{ background: 'rgba(255, 159, 10, 0.2)', color: '#ff9f0a', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700' }}>
                EN CURSO
              </span>
            </div>

            <p style={{ margin: '0 0 1.25rem 0', color: colors.textSecondary, fontSize: '0.9rem', lineHeight: '1.4' }}>
              Iniciaste <strong>{existingActiveSession.routine?.name || 'Entrenamiento Libre'}</strong> con <strong>{existingActiveSession.sets?.length || 0} series</strong> registradas. Para que tus series sumen a tus estadísticas del mes y mapa de calor, finalízala o continúa agregando ejercicios.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleResumeSession(existingActiveSession)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'var(--accent, #34c759)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ▶ Reanudar Sesión
              </button>

              <button
                onClick={() => handleFinishExisting(existingActiveSession.id)}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-primary)',
                  border: `1px solid ${colors.borderLine}`,
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✓ Finalizar y Computar Métricas
              </button>

              <button
                onClick={() => handleDiscardExisting(existingActiveSession.id)}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'transparent',
                  color: '#ff4d4f',
                  border: '1px solid rgba(255, 77, 79, 0.3)',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                ✕ Descartar
              </button>
            </div>
          </div>
        )}

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: `1px solid ${colors.borderLine}` }}>
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

      {/* Balance Nutricional Diario */}
      <DailyNutritionCard />

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
                                        <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
                        <input 
                          type="number" step="0.5" 
                          placeholder={isBw ? "+ lastre kg (0)" : "kg"} 
                          value={currentInput.weight} 
                          onChange={(e) => handleInputChange(ex.id, 'weight', e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveSet(ex)}
                          style={{ ...inputStyle, width: '100%', paddingRight: !isBw ? '40px' : '0.75rem' }} 
                        />
                        {!isBw && (
                          <button 
                            type="button"
                            onClick={() => setActiveCalculator(activeCalculator === ex.id ? null : ex.id)}
                            style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' }}
                            title="Calculadora de Barra (Peso Libre)"
                          >
                            🏋️
                          </button>
                        )}
                        
                        {/* Popover de Calculadora */}
                        {activeCalculator === ex.id && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 100, background: 'var(--bg-card)', border: '1px solid var(--border-line)', padding: '1rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '250px' }}>
                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Calculadora de Barra</h4>
                            
                            <div style={{ marginBottom: '0.8rem' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Peso de la barra (kg)</label>
                              <input 
                                type="number" step="0.5"
                                value={barWeight}
                                onChange={(e) => setBarWeight(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-line)', background: 'var(--bg-input)', color: 'white' }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Discos por lado (kg)</label>
                              <input 
                                type="number" step="0.5"
                                value={platesWeight}
                                onChange={(e) => setPlatesWeight(e.target.value)}
                                placeholder="Ej: 20"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyCalculator(ex.id)}
                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-line)', background: 'var(--bg-input)', color: 'white' }}
                              />
                            </div>
                            
                            <button 
                              type="button"
                              onClick={() => handleApplyCalculator(ex.id)}
                              style={{ width: '100%', padding: '0.6rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Aplicar ({(parseFloat(platesWeight || 0) * 2 + parseFloat(barWeight || 0))} kg)
                            </button>
                          </div>
                        )}
                      </div>
                    <input 
                      type="number" placeholder="reps" 
                      value={currentInput.reps} 
                      onChange={(e) => handleInputChange(ex.id, 'reps', e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveSet(ex)}
                      style={inputStyle} 
                    />
                    <button 
                      type="button"
                      onClick={() => handleSaveSet(ex)}
                      disabled={savingExerciseId === ex.id}
                      style={{ 
                        padding: '0.75rem 1.25rem', 
                        background: savingExerciseId === ex.id ? 'rgba(255,255,255,0.2)' : colors.accentRed, 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: savingExerciseId === ex.id ? 'not-allowed' : 'pointer', 
                        fontWeight: 'bold',
                        minWidth: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem'
                      }}
                      title="Guardar serie"
                    >
                      {savingExerciseId === ex.id ? '...' : '✓'}
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
