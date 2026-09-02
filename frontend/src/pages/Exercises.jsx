import React, { useState, useEffect } from 'react';
import { getExercises, createExercise, deleteExercise } from '../services/exerciseService';

const Exercises = () => {
  const [exercises, setExercises] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', muscle_group: '', description: '' });
  
  // Nuevo estado para el filtro
  const [selectedGroup, setSelectedGroup] = useState('Todos');
  const filterOptions = ['Todos', 'pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core', 'cardio', 'otro'];

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

  // Filtrar ejercicios basados en la selección
  const displayedExercises = selectedGroup === 'Todos' 
    ? exercises 
    : exercises.filter(ex => ex.muscle_group === selectedGroup);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ maxWidth: '700px' }}>
          <h1 style={{ margin: 0, color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: '700', fontSize: '1.75rem' }}>Catálogo de Ejercicios</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
            Esta es tu biblioteca maestra. Explora el catálogo o crea ejercicios personalizados para tus rutinas.
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '0.75rem 1.5rem', background: 'var(--accent)', color: '#000000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '0.95rem', whiteSpace: 'nowrap' }}
        >
          + Nuevo Ejercicio
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {filterOptions.map(option => (
          <button
            key={option}
            onClick={() => setSelectedGroup(option)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '20px',
              border: `1px solid ${selectedGroup === option ? 'var(--accent)' : 'var(--border-line)'}`,
              background: selectedGroup === option ? 'rgba(52, 199, 89, 0.15)' : 'transparent',
              color: selectedGroup === option ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {displayedExercises.map(ex => (
          <div key={ex.id} className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.75rem' }}>{ex.name}</h3>
            <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', border: '1px solid var(--border-line)', color: 'var(--text-secondary)', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>
              {ex.muscle_group}
            </span>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>{ex.description || "Sin descripción detallada."}</p>
            
            {ex.is_custom && (
              <button 
                onClick={() => handleDelete(ex.id)}
                style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Eliminar ejercicio personalizado"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
        {displayedExercises.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>No hay ejercicios en esta categoría.</p>}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', padding: '2.5rem', borderRadius: '24px', width: '95%', maxWidth: '450px', border: '1px solid var(--border-line)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <h2 style={{ marginTop: 0, color: 'var(--text-primary)', marginBottom: '2rem', fontWeight: '700', fontSize: '1.5rem' }}>Añadir Ejercicio</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <input 
                name="name" value={formData.name} onChange={handleChange} 
                placeholder="Nombre del Ejercicio" required 
              />
              <select 
                name="muscle_group" value={formData.muscle_group} onChange={handleChange} required 
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
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}>Cancelar</button>
                <button type="submit" style={{ padding: '0.8rem 1.5rem', background: 'var(--accent)', color: '#000000', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem' }}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exercises;
