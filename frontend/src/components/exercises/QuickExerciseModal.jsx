import React, { useState } from 'react';
import { createExercise } from '../../services/exerciseService';

const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Hombros',
  'Brazos',
  'Bíceps',
  'Tríceps',
  'Core',
  'Glúteos',
  'Cardio',
  'Full Body',
];

const QuickExerciseModal = ({ isOpen, onClose, onExerciseCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: 'Pecho',
    description: '',
    equipment: '',
    is_bodyweight: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('El nombre del ejercicio es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: formData.name.trim(),
        muscle_group: formData.muscle_group,
        description: formData.description.trim(),
        equipment: formData.equipment.trim(),
        is_bodyweight: formData.is_bodyweight,
      };

      const createdExercise = await createExercise(payload);
      
      // Limpiar y resetear
      setFormData({
        name: '',
        muscle_group: 'Pecho',
        description: '',
        equipment: '',
        is_bodyweight: false,
      });

      // Notificar al componente padre
      onExerciseCreated(createdExercise);
      onClose();
    } catch (err) {
      console.error('Error creando ejercicio rápido:', err);
      setErrorMsg(
        err.response?.data?.detail || 'Error al guardar el ejercicio. Inténtalo de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10001, // Mayor que el modal de rutinas para abrirse encima sin conflicto
        backdropFilter: 'blur(8px)',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card, #1c1c1e)',
          color: 'var(--text-primary, #fff)',
          padding: '2rem',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '500px',
          border: '1px solid var(--border-line, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>⚡</span>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
              Crear Nuevo Ejercicio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              color: '#fff',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.8rem',
              borderRadius: '10px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-secondary, #888)',
                marginBottom: '0.4rem',
              }}
            >
              Nombre del Ejercicio *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ej. Press Francés con Mancuernas"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                background: 'var(--bg-input, #2c2c2e)',
                color: '#fff',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-secondary, #888)',
                marginBottom: '0.4rem',
              }}
            >
              Grupo Muscular
            </label>
            <select
              value={formData.muscle_group}
              onChange={(e) => handleChange('muscle_group', e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                background: 'var(--bg-input, #2c2c2e)',
                color: '#fff',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              {MUSCLE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-secondary, #888)',
                marginBottom: '0.4rem',
              }}
            >
              Equipamiento (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Polea baja, Barra Z, Mancuernas..."
              value={formData.equipment}
              onChange={(e) => handleChange('equipment', e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                background: 'var(--bg-input, #2c2c2e)',
                color: '#fff',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-secondary, #888)',
                marginBottom: '0.4rem',
              }}
            >
              Descripción / Notas de técnica
            </label>
            <textarea
              placeholder="Indicaciones sobre postura, rango de movimiento o agarre..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                border: '1px solid var(--border-line, rgba(255, 255, 255, 0.15))',
                background: 'var(--bg-input, #2c2c2e)',
                color: '#fff',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
                minHeight: '80px',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.9rem',
              color: 'var(--text-secondary, #ccc)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={formData.is_bodyweight}
              onChange={(e) => handleChange('is_bodyweight', e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent, #34c759)' }}
            />
            <span>¿Es un ejercicio con peso corporal (Calistenia)?</span>
          </label>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.8rem',
              marginTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary, #888)',
                cursor: 'pointer',
                fontWeight: '600',
                padding: '0.8rem 1.2rem',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.8rem 1.8rem',
                background: 'var(--accent, #34c759)',
                color: '#000000',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: isSubmitting ? 'default' : 'pointer',
                boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)',
              }}
            >
              {isSubmitting ? 'Guardando...' : 'Crear y Añadir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickExerciseModal;
