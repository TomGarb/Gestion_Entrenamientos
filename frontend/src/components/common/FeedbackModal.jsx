import React, { useState } from 'react';
import api from '../../services/api';

const FeedbackModal = ({ onClose }) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError('');
    try {
      await api.post('/api/feedback', { message });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error enviando feedback:", err);
      setError("Hubo un error al enviar tu mensaje. Inténtalo más tarde.");
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px',
        width: '90%', maxWidth: '400px', border: '1px solid var(--border-line)'
      }}>
        <h2 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.4rem' }}>Enviar Sugerencia</h2>
        
        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <span style={{ fontSize: '3rem' }}>✅</span>
            <p style={{ color: 'var(--accent)', fontWeight: 'bold', marginTop: '1rem' }}>¡Mensaje enviado!</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Gracias por ayudarnos a mejorar.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              ¿Encontraste un error o tienes una idea para mejorar la app? Cuéntanos:
            </p>
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe aquí tu sugerencia o el problema que encontraste..."
              style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-line)',
                color: 'var(--text-primary)', padding: '1rem', borderRadius: '8px',
                minHeight: '120px', resize: 'vertical', fontFamily: 'inherit'
              }}
              required
            />
            
            {error && <p style={{ color: 'var(--danger)', margin: 0, fontSize: '0.85rem' }}>{error}</p>}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                onClick={onClose}
                disabled={loading}
                style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading || !message.trim()}
                style={{ 
                  background: 'var(--accent)', color: '#000', border: 'none', 
                  padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 'bold', 
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? 'Enviando...' : 'Enviar Reporte'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
