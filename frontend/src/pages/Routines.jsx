import React, { useState, useEffect } from 'react';
import { getRoutines, createRoutine, deleteRoutine } from '../services/routineService';
import { getExercises } from '../services/exerciseService';

// --- Paleta "Hierro y Sudor" ---
const colors = {
  background: '#1C1C1E',
  cardBg: '#2C2C2E',
  borderLine: '#3A3A3C',
  textPrimary: '#F2F2F7',
  textSecondary: '#AEAEB2',
  accentRed: '#FFD60A',
  accentRedHover: '#FFD60A',
  successGreen: '#32D74B'
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

  return (
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ maxWidth: '700px' }}>
          <h1 style={{ margin: 0, color: colors.textPrimary, marginBottom: '0.5rem' }}>Mis Rutinas</h1>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '1rem', lineHeight: '1.5' }}>
            Las rutinas son tus plantillas de entrenamiento (ej. "Día de Piernas" o "Full Body"). Agrupa tus ejercicios aquí para que, al momento de ir al gimnasio, tu plan ya esté estructurado y solo tengas que anotar los pesos.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: `0 4px 10px rgba(217, 4, 41, 0.4)`, whiteSpace: 'nowrap' }}
        >
          + Nueva Rutina
        </button>
      </div>

      {/* Grid de Rutinas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
        {routines.map(routine => (
          <div key={routine.id} style={{ borderRadius: '12px', padding: '1.5rem', backgroundColor: colors.cardBg, border: `1px solid ${colors.borderLine}`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', position: 'relative' }}>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: colors.textPrimary, fontSize: '1.5rem' }}>{routine.name}</h2>
            <p style={{ color: colors.textSecondary, fontSize: '0.9rem', marginBottom: '1.5rem' }}>{routine.description || "Sin descripción"}</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {routine.routine_exercises.map((rx, idx) => (
                <div key={rx.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#E2E8F0' }}>{idx + 1}. {rx.exercise?.name || 'Ejercicio'}</span>
                  <span style={{ color: colors.accentRed, fontWeight: 'bold' }}>{rx.sets}x{rx.reps}</span>
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleDelete(routine.id)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: colors.accentRed, cursor: 'pointer', fontSize: '1.2rem', padding: '0' }}
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(10, 17, 40, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ background: colors.cardBg, color: 'white', padding: '2.5rem', borderRadius: '16px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${colors.borderLine}`, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <h2 style={{ marginTop: 0, color: colors.textPrimary, marginBottom: '2rem' }}>Crear Nueva Rutina</h2>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Datos Básicos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <input name="name" value={formData.name} onChange={handleFormChange} placeholder="Nombre de la Rutina (ej. Push Day)" required style={inputStyle} />
                <textarea name="description" value={formData.description} onChange={handleFormChange} placeholder="Descripción o enfoque" style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
              </div>

              {/* Constructor de Ejercicios */}
              <div style={{ borderTop: `1px solid ${colors.borderLine}`, paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Ejercicios</h3>
                  <button type="button" onClick={addExerciseRow} style={{ padding: '0.5rem 1rem', background: 'rgba(217, 4, 41, 0.1)', color: colors.accentRed, border: `1px solid ${colors.accentRed}`, borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    + Agregar Ejercicio
                  </button>
                </div>

                {routineExercises.length === 0 ? (
                  <p style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>Añade ejercicios para comenzar.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {routineExercises.map((row, index) => (
                      <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                        
                        <select required value={row.exercise_id} onChange={(e) => handleRoutineExerciseChange(index, 'exercise_id', e.target.value)} style={{ ...inputStyle, flex: 2 }}>
                          <option value="">Seleccionar Ejercicio...</option>
                          {exercisesCatalog.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group})</option>
                          ))}
                        </select>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                          <input type="number" required min="1" value={row.sets} onChange={(e) => handleRoutineExerciseChange(index, 'sets', e.target.value)} placeholder="Series" title="Series" style={{ ...inputStyle, width: '100%', textAlign: 'center' }} />
                          <span style={{ display: 'flex', alignItems: 'center', color: colors.textSecondary }}>x</span>
                          <input type="number" required min="1" value={row.reps} onChange={(e) => handleRoutineExerciseChange(index, 'reps', e.target.value)} placeholder="Reps" title="Repeticiones" style={{ ...inputStyle, width: '100%', textAlign: 'center' }} />
                        </div>
                        
                        <button type="button" onClick={() => removeExerciseRow(index)} style={{ background: 'transparent', border: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: '1.2rem' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: `1px solid ${colors.borderLine}`, paddingTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 2rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Guardar Rutina</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const inputStyle = {
  padding: '0.9rem',
  borderRadius: '6px',
  border: `1px solid #1E325C`,
  background: '#0A1128',
  color: 'white',
  fontSize: '1rem',
};

export default Routines;
