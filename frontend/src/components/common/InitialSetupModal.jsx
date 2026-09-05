import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const InitialSetupModal = () => {
  const { user, isProfileComplete, updateProfile } = useContext(AuthContext);
  const [peso, setPeso] = useState(user?.weight_kg || user?.peso || '');
  const [altura, setAltura] = useState(user?.height_cm || user?.altura || '');
  const [fotoPerfil, setFotoPerfil] = useState(user?.foto_perfil || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Si no hay usuario o el perfil ya está completo, no renderizar el modal
  if (!user || isProfileComplete) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const pesoNum = parseFloat(peso);
    const alturaNum = parseFloat(altura);

    if (!pesoNum || pesoNum <= 0 || !alturaNum || alturaNum <= 0) {
      setError('Por favor ingresa un peso y una altura válidos.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        peso: pesoNum,
        altura: alturaNum,
        weight_kg: pesoNum,
        height_cm: alturaNum,
        foto_perfil: fotoPerfil.trim() || user?.foto_perfil || null
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar los datos biométricos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-card, #1c1c1e)',
        border: '1px solid var(--border-line, rgba(255,255,255,0.15))',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '440px',
        width: '100%',
        color: 'var(--text-primary, #ffffff)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.25s ease-out'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⚖️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            Completa tus datos iniciales
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #a1a1aa)', lineHeight: '1.4' }}>
            Hola <strong style={{ color: 'var(--text-primary, #fff)' }}>{user.username}</strong>. Para calcular tus cargas, ejercicios con peso corporal y métricas corporales, necesitamos tu peso y altura actuales.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fca5a5',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                Peso corporal (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                placeholder="ej. 75.0"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--bg-input, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-line, rgba(255,255,255,0.2))',
                  color: 'inherit',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                Altura (cm) *
              </label>
              <input
                type="number"
                step="0.5"
                min="50"
                max="260"
                placeholder="ej. 175"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--bg-input, rgba(255,255,255,0.05))',
                  border: '1px solid var(--border-line, rgba(255,255,255,0.2))',
                  color: 'inherit',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.4rem' }}>
              Foto de perfil (URL opcional)
            </label>
            <input
              type="url"
              placeholder="https://ejemplo.com/avatar.jpg"
              value={fotoPerfil}
              onChange={(e) => setFotoPerfil(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--bg-input, rgba(255,255,255,0.05))',
                border: '1px solid var(--border-line, rgba(255,255,255,0.2))',
                color: 'inherit',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.85rem',
              backgroundColor: 'var(--accent, #007bff)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '0.5rem',
              boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)'
            }}
          >
            {loading ? 'Guardando...' : 'Comenzar a Entrenar 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InitialSetupModal;
