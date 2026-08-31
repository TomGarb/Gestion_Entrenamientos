import React, { useState } from 'react';
import { generateLinkCode, testConnection } from '../services/telegramService';

// --- Paleta "Energía y Potencia" ---
const colors = {
  background: '#0A1128',
  cardBg: '#121F3D',
  borderLine: '#1E325C',
  textPrimary: '#FFFFFF',
  textSecondary: '#8B9BB4',
  accentRed: '#D90429',
  successGreen: '#20BF55'
};

const Settings = () => {
  const [code, setCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const data = await generateLinkCode();
      setCode(data.code);
    } catch (error) {
      console.error("Error generating code", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const response = await testConnection();
      showToast(response.message || "Conexión exitosa");
    } catch (error) {
      showToast(error.response?.data?.detail || "Error en la conexión. Asegúrate de estar vinculado.");
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div style={{ backgroundColor: colors.background, color: colors.textPrimary, minHeight: '100vh', padding: '2rem', margin: '-2rem' }}>
      
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: colors.textPrimary }}>Configuración</h1>
        <p style={{ color: colors.textSecondary, marginTop: '0.5rem', fontSize: '1.1rem' }}>Personaliza tu experiencia y dispositivos.</p>
      </header>

      <section style={{ backgroundColor: colors.cardBg, padding: '2rem', borderRadius: '16px', border: `1px solid ${colors.borderLine}`, boxShadow: '0 10px 30px rgba(0,0,0,0.4)', maxWidth: '600px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: colors.textPrimary }}>Integración con Telegram</h2>
        
        <p style={{ color: colors.textSecondary, lineHeight: '1.6', marginBottom: '2rem' }}>
          Registra tus entrenamientos al instante sin desbloquear la app web. Vincula tu cuenta con nuestro bot oficial y empieza a enviar tus series escribiendo: <code>60 10</code> (60kg x 10reps).
        </p>

        {code && (
          <div style={{ backgroundColor: 'rgba(32, 191, 85, 0.1)', border: `1px solid ${colors.successGreen}`, padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 1rem 0', color: colors.textSecondary }}>Tu código de vinculación (expira al usarlo):</p>
            <h3 style={{ margin: 0, fontSize: '2.5rem', color: colors.successGreen, letterSpacing: '8px' }}>{code}</h3>
            <p style={{ marginTop: '1rem', marginBottom: 0, color: colors.textPrimary }}>
              Envía este código al bot <strong>@TuBotGimnasio</strong> en Telegram.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={handleGenerateCode} 
            disabled={loading}
            style={{ padding: '0.75rem 1.5rem', background: colors.accentRed, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', flex: 1, boxShadow: '0 4px 10px rgba(217, 4, 41, 0.4)' }}
          >
            {loading ? 'Generando...' : 'Generar Código de Vinculación'}
          </button>
          
          <button 
            onClick={handleTestConnection} 
            style={{ padding: '0.75rem 1.5rem', background: 'transparent', color: colors.textPrimary, border: `1px solid ${colors.borderLine}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', flex: 1 }}
          >
            Enviar Prueba de Conexión
          </button>
        </div>
      </section>

      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', backgroundColor: colors.accentRed, color: 'white', padding: '1rem 2rem', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, fontWeight: 'bold', animation: 'fadeIn 0.3s ease-in-out' }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default Settings;
