import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const QuickWeightModal = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useContext(AuthContext);
  const [weight, setWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      const current = user?.weight_kg || user?.peso || '';
      setWeight(current ? String(current) : '');
      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const currentWeightNum = parseFloat(user?.weight_kg || user?.peso) || null;
  const targetWeightNum = parseFloat(user?.target_weight_kg) || null;

  const handleQuickAdjust = (delta) => {
    const val = parseFloat(weight) || currentWeightNum || 70;
    const updated = Math.round((val + delta) * 10) / 10;
    if (updated > 20 && updated < 400) {
      setWeight(String(updated));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(weight);

    if (isNaN(val) || val <= 20 || val > 400) {
      setErrorMsg('Por favor ingresa un peso válido (entre 20 y 400 kg).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await updateProfile({ weight_kg: val });
      setSuccessMsg(`✓ Peso actualizado a ${val} kg.`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error actualizando peso:', err);
      setErrorMsg(err.response?.data?.detail || 'No se pudo actualizar el peso.');
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-card, #1c1c1e)',
          color: 'var(--text-primary, #fff)',
          padding: '1.75rem',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '420px',
          border: '1px solid var(--border-line, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>⚖️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Actualizar Peso</h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #888)' }}>
                Mantén tu progreso biométrico al día
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              color: '#fff',
              width: '34px',
              height: '34px',
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

        {successMsg && (
          <div
            style={{
              background: 'rgba(52, 199, 89, 0.15)',
              border: '1px solid var(--accent, #34c759)',
              color: 'var(--accent, #34c759)',
              padding: '0.75rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              fontSize: '0.88rem',
              fontWeight: '600',
              textAlign: 'center',
            }}
          >
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.75rem',
              borderRadius: '12px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Info actual y objetivo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            background: 'var(--bg-input, #2c2c2e)',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            border: '1px solid var(--border-line, rgba(255, 255, 255, 0.08))',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #888)' }}>Registrado</div>
            <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-primary, #fff)' }}>
              {currentWeightNum ? `${currentWeightNum} kg` : '--'}
            </div>
          </div>
          {targetWeightNum && (
            <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-line, rgba(255,255,255,0.1))', paddingLeft: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #888)' }}>Objetivo</div>
              <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--accent, #34c759)' }}>
                {targetWeightNum} kg
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary, #888)', marginBottom: '0.4rem' }}>
              Nuevo peso corporal (kg)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                step="0.1"
                min="20"
                max="400"
                required
                placeholder="Ej. 75.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--accent, #34c759)',
                  background: 'var(--bg-card, #1c1c1e)',
                  color: '#fff',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-secondary, #aaa)' }}>
                kg
              </span>
            </div>
          </div>

          {/* Botones de ajuste rápido */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            {[-1.0, -0.5, 0.5, 1.0].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleQuickAdjust(delta)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.25rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--border-line, rgba(255, 255, 255, 0.1))',
                  color: delta > 0 ? 'var(--accent, #34c759)' : '#fff',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {delta > 0 ? `+${delta}` : delta} kg
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary, #888)',
                cursor: 'pointer',
                fontWeight: '600',
                padding: '0.7rem 1.2rem',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !weight}
              style={{
                padding: '0.8rem 1.8rem',
                background: 'var(--accent, #34c759)',
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: (isSubmitting || !weight) ? 'default' : 'pointer',
                fontSize: '0.95rem',
                boxShadow: '0 4px 14px rgba(52, 199, 89, 0.3)',
                opacity: (isSubmitting || !weight) ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Peso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickWeightModal;
