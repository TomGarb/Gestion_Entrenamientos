import React, { useState, useEffect } from 'react';
import { getRoutines, createRoutine, deleteRoutine } from '../services/routineService';
import { getExercises } from '../services/exerciseService';

// --- Paleta "Hierro y Sudor" ---
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

const Routines = () => {
  const [routines, setRoutines] = useState([]);
  const [exercisesCatalog, setExercisesCatalog] = useState([]);
  
  // Estado para el modal y el formulario de rutina
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  // Estado para los ejercicios asignados dinámicamente
  const [routineExercises, setRoutineExercises] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [routinesData, catalogData] = await Promise.all([
        getRoutines(),
        getExercises()
      ]);
      setRoutines(routinesData);
      setExercisesCatalog(catalogData);
    } catch (error) {
      console.error("Error cargando datos iniciales", error);
    }
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Lógica del Formulario Dinámico (Ejercicios) ---
  const addExerciseRow = () => {
    setRoutineExercises([...routineExercises, { exercise_id: '', sets: 3, reps: 10, rest_seconds: 60 }]);
  };

  const removeExerciseRow = (index) => {
    const updated = routineExercises.filter((_, i) => i !== index);
    setRoutineExercises(updated);
  };

  const handleRoutineExerciseChange = (index, field, value) => {
    const updated = [...routineExercises];
    updated[index][field] = value;
    setRoutineExercises(updated);
  };

  // --- Enviar Payload ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (routineExercises.length === 0) {
      alert("Debes agregar al menos un ejercicio a la rutina.");
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      is_public: false,
      exercises: routineExercises.map(re => ({
        exercise_id: parseInt(re.exercise_id),
        sets: parseInt(re.sets),
        reps: parseInt(re.reps),
        rest_seconds: parseInt(re.rest_seconds)
      }))
    };

    try {
      const newRoutine = await createRoutine(payload);
      setRoutines([...routines, newRoutine]);
      
      // Reset form
      setShowModal(false);
      setFormData({ name: '', description: '' });
      setRoutineExercises([]);
    } catch (error) {
      console.error("Error creando rutina", error);
      alert("Hubo un error al crear la rutina.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta rutina?")) return;
    try {
      await deleteRoutine(id);
      setRoutines(routines.filter(r => r.id !== id));
    } catch (error) {
      console.error("Error eliminando rutina", error);
    }
  };

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

  return (
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ maxWidth: '700px' }}>
          <h1 style={{ margin: 0, color: colors.textPrimary, marginBottom: '0.5rem', fontWeight: '700', fontSize: '2.5rem' }}>Mis Rutinas</h1>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '1.1rem', lineHeight: '1.6' }}>
            Las rutinas son tus plantillas de entrenamiento (ej. "Día de Piernas" o "Full Body"). Agrupa tus ejercicios aquí para que, al momento de ir al gimnasio, tu plan ya esté estructurado y solo tengas que anotar los pesos.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.8rem', background: colors.mintGradient, color: '#FFFFFF', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', boxShadow: '0 10px 20px rgba(74, 222, 128, 0.2)', whiteSpace: 'nowrap' }}
        >
          + Nueva Rutina
        </button>
      </div>

      {/* Grid de Rutinas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
        {routines.map(routine => (
          <div key={routine.id} style={{ borderRadius: '24px', padding: '2rem', backgroundColor: colors.cardBg, border: 'none', boxShadow: colors.cardShadow, position: 'relative' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: colors.textPrimary, fontSize: '1.6rem', fontWeight: '700' }}>{routine.name}</h2>
            <p style={{ color: colors.textSecondary, fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>{routine.description || "Sin descripción"}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {routine.routine_exercises.map((rx, idx) => (
                <div key={rx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '1rem', borderRadius: '16px' }}>
                  <span style={{ fontWeight: '600', color: colors.textPrimary, fontSize: '0.95rem' }}>{idx + 1}. {rx.exercise?.name || 'Ejercicio'}</span>
                  <span style={{ color: colors.peachText, backgroundColor: colors.peachLight, padding: '0.3rem 0.8rem', borderRadius: '9999px', fontWeight: '700', fontSize: '0.85rem' }}>{rx.sets}x{rx.reps}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleDelete(routine.id)}
              style={{ position: 'absolute', top: '2rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}
              title="Eliminar Rutina"
            >
              🗑️
            </button>
          </div>
        ))}
        {routines.length === 0 && <p style={{ color: colors.textSecondary, fontSize: '1.1rem' }}>No tienes rutinas creadas aún.</p>}
      </div>

      {/* Modal / Formulario Lateral */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: colors.cardBg, color: colors.textPrimary, padding: '3rem', borderRadius: '30px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', border: 'none', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ marginTop: 0, color: colors.textPrimary, marginBottom: '2rem', fontWeight: '700', fontSize: '2rem' }}>Crear Nueva Rutina</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Datos Básicos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Nombre de la Rutina (ej. Push Day)" required style={inputStyle} />
                <textarea name="description" value={formData.description} onChange={handleFormChange} placeholder="Descripción o enfoque" style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} />
              </div>

              {/* Constructor de Ejercicios */}
              <div style={{ borderTop: `1px solid ${colors.borderLine}`, paddingTop: '2rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600' }}>Ejercicios</h3>
                  <button type="button" onClick={addExerciseRow} style={{ padding: '0.6rem 1.2rem', background: '#F0FDF4', color: '#16A34A', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
                    + Agregar Ejercicio
                  </button>
                </div>

                {routineExercises.length === 0 ? (
                  <p style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: '2rem', background: '#F8FAFC', borderRadius: '16px' }}>Añade ejercicios para comenzar.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {routineExercises.map((row, index) => (
                      <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#F8FAFC', padding: '1rem', borderRadius: '16px' }}>
                        
                        <select required value={row.exercise_id} onChange={(e) => handleRoutineExerciseChange(index, 'exercise_id', e.target.value)} style={{ ...inputStyle, flex: 2, background: '#FFFFFF' }}>
                          <option value="">Seleccionar Ejercicio...</option>
                          {exercisesCatalog.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group})</option>
                          ))}
                        </select>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                          <input type="number" required min="1" value={row.sets} onChange={(e) => handleRoutineExerciseChange(index, 'sets', e.target.value)} placeholder="Series" title="Series" style={{ ...inputStyle, width: '100%', textAlign: 'center', background: '#FFFFFF' }} />
                          <span style={{ display: 'flex', alignItems: 'center', color: colors.textSecondary, fontWeight: '600' }}>x</span>
                          <input type="number" required min="1" value={row.reps} onChange={(e) => handleRoutineExerciseChange(index, 'reps', e.target.value)} placeholder="Reps" title="Repeticiones" style={{ ...inputStyle, width: '100%', textAlign: 'center', background: '#FFFFFF' }} />
                        </div>
                        
                        <button type="button" onClick={() => removeExerciseRow(index)} style={{ background: 'transparent', border: 'none', color: '#F43F5E', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem' }}>
                          ✕ 
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.8rem 2.5rem', background: colors.mintGradient, color: 'white', border: 'none', borderRadius: '9999px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', boxShadow: '0 10px 20px rgba(74, 222, 128, 0.2)' }}>Guardar Rutina</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  padding: '1rem',
  borderRadius: '12px',
  border: `1px solid #E2E8F0`,
  background: '#F8FAFC',
  color: '#334155',
  fontSize: '1rem',
  outline: 'none',
  fontFamily: 'Poppins, sans-serif'
};

export default Routines;
