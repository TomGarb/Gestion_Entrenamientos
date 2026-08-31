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

  // --- Paleta "Energía y Potencia" ---
  const colors = {
    background: '#0B132B', // Azul marino profundo
    cardBg: '#1C2541',     // Azul marino más claro para tarjetas
    textPrimary: '#FFFFFF',
    textSecondary: '#6FFFE9', // Un cian/aqua para resaltar sutilmente
    accentRed: '#FF2A2A',     // Rojo vibrante para botones de acción
    accentRedHover: '#D90429'
  };

  return (
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ margin: 0, color: colors.textPrimary }}>Catálogo de Ejercicios</h1>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 6px rgba(255, 42, 42, 0.3)' }}
        >
          + Nuevo Ejercicio
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {exercises.map(ex => (
          <div key={ex.id} style={{ border: 'none', borderRadius: '12px', padding: '1.5rem', backgroundColor: colors.cardBg, color: 'white', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, color: colors.textPrimary, fontSize: '1.4rem' }}>{ex.name}</h3>
            <span style={{ display: 'inline-block', padding: '0.4rem 0.8rem', background: 'rgba(111, 255, 233, 0.1)', color: colors.textSecondary, borderRadius: '20px', fontSize: '0.85rem', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
              {ex.muscle_group}
            </span>
            <p style={{ fontSize: '0.95rem', color: '#A0AAB2', margin: 0, lineHeight: '1.5' }}>{ex.description || "Sin descripción detallada."}</p>
            
            {ex.is_custom && (
              <button 
                onClick={() => handleDelete(ex.id)}
                style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255, 42, 42, 0.1)', border: 'none', color: colors.accentRed, cursor: 'pointer', fontSize: '1.2rem', borderRadius: '50%', width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                title="Eliminar ejercicio personalizado"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        {exercises.length === 0 && <p style={{ color: '#A0AAB2', fontSize: '1.1rem' }}>Cargando ejercicios o catálogo vacío...</p>}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(11, 19, 43, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ background: colors.cardBg, color: 'white', padding: '2.5rem', borderRadius: '12px', width: '450px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h2 style={{ marginTop: 0, color: colors.textPrimary, marginBottom: '2rem' }}>Añadir Ejercicio</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input 
                name="name" value={formData.name} onChange={handleChange} 
                placeholder="Nombre del Ejercicio" required 
                style={{ padding: '0.9rem', borderRadius: '6px', border: '1px solid #2A324B', background: '#0B132B', color: 'white', fontSize: '1rem' }}
              />
              <select 
                name="muscle_group" value={formData.muscle_group} onChange={handleChange} required 
                style={{ padding: '0.9rem', borderRadius: '6px', border: '1px solid #2A324B', background: '#0B132B', color: 'white', fontSize: '1rem' }}
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
                style={{ padding: '0.9rem', borderRadius: '6px', border: '1px solid #2A324B', background: '#0B132B', color: 'white', minHeight: '100px', fontSize: '1rem', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'none', color: '#A0AAB2', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exercises;
