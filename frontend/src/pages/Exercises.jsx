import React, { useState, useEffect } from 'react';
import { getExercises, createExercise, deleteExercise } from '../services/exerciseService';

const Exercises = () => {
  const [exercises, setExercises] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', muscle_group: '', description: '' });

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const data = await getExercises();
      setExercises(data);
    } catch (error) {
      console.error("Error cargando ejercicios", error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newExercise = await createExercise(formData);
      setExercises([...exercises, newExercise]);
      setShowModal(false);
      setFormData({ name: '', muscle_group: '', description: '' });
    } catch (error) {
      console.error("Error creando ejercicio", error);
      alert("Hubo un error al crear el ejercicio.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este ejercicio?")) return;
    try {
      await deleteExercise(id);
      setExercises(exercises.filter(ex => ex.id !== id));
    } catch (error) {
      console.error("Error eliminando ejercicio", error);
      alert("No puedes eliminar un ejercicio base del sistema, o hubo un error.");
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
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ maxWidth: '700px' }}>
          <h1 style={{ margin: 0, color: colors.textPrimary, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Catálogo de Ejercicios</h1>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: '1rem', lineHeight: '1.5' }}>
            Esta es tu biblioteca maestra. Aquí están todos los ejercicios que puedes realizar. Si no encuentras tu favorito, agrégalo a tu cuenta personal para poder seleccionarlo cuando armes tus rutinas.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: '#1C1C1E', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
        >
          + Nuevo Ejercicio
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {exercises.map(ex => (
          <div key={ex.id} style={{ border: `2px solid ${colors.borderLine}`, borderRadius: '4px', padding: '1.5rem', backgroundColor: colors.cardBg, color: 'white', position: 'relative' }}>
            <h3 style={{ marginTop: 0, color: colors.textPrimary, fontSize: '1.4rem', textTransform: 'uppercase', fontWeight: '800' }}>{ex.name}</h3>
            <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', border: `1px solid ${colors.textSecondary}`, color: colors.textSecondary, borderRadius: '2px', fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
              {ex.muscle_group}
            </span>
            <p style={{ fontSize: '0.95rem', color: colors.textSecondary, margin: 0, lineHeight: '1.5' }}>{ex.description || "Sin descripción detallada."}</p>
            
            {ex.is_custom && (
              <button 
                onClick={() => handleDelete(ex.id)}
                style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: colors.danger, cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Eliminar ejercicio personalizado"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        {exercises.length === 0 && <p style={{ color: colors.textSecondary, fontSize: '1.1rem' }}>Cargando ejercicios o catálogo vacío...</p>}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(28, 28, 30, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.cardBg, color: 'white', padding: '2.5rem', borderRadius: '4px', width: '450px', border: `1px solid ${colors.borderLine}` }}>
            <h2 style={{ marginTop: 0, color: colors.textPrimary, marginBottom: '2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Añadir Ejercicio</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input 
                name="name" value={formData.name} onChange={handleChange} 
                placeholder="Nombre del Ejercicio" required 
                style={{ padding: '0.9rem', borderRadius: '4px', border: `1px solid ${colors.borderLine}`, background: colors.background, color: 'white', fontSize: '1rem' }}
              />
              <select 
                name="muscle_group" value={formData.muscle_group} onChange={handleChange} required 
                style={{ padding: '0.9rem', borderRadius: '4px', border: `1px solid ${colors.borderLine}`, background: colors.background, color: 'white', fontSize: '1rem' }}
              >
                <option value="">Selecciona grupo muscular...</option>
                <option value="pecho">Pecho</option>
                <option value="espalda">Espalda</option>
                <option value="piernas">Piernas</option>
                <option value="hombros">Hombros</option>
                <option value="brazos">Brazos</option>
                <option value="core">Core</option>
                <option value="cardio">Cardio</option>
                <option value="otro">Otro</option>
              </select>
              <textarea 
                name="description" value={formData.description} onChange={handleChange} 
                placeholder="Descripción opcional" 
                style={{ padding: '0.9rem', borderRadius: '4px', border: `1px solid ${colors.borderLine}`, background: colors.background, color: 'white', minHeight: '100px', fontSize: '1rem', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', color: colors.textSecondary, cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: '#1C1C1E', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exercises;
